"""Batch the user-selected Bumi image provider; preserve IDs for safe resume.

Reference files use the documented multipart upload. Credential lives in memory.
Never retries a paid POST. Existing job IDs are polled on a later invocation.
"""
import concurrent.futures
import getpass
import json
import mimetypes
import os
from pathlib import Path
import time
import urllib.parse
import urllib.request
import uuid
from bumi_image import BASE, NoRedirect, api, data_record, redact


def upload(path, key):
    path = Path(path)
    if path.stat().st_size > 20 * 1024 * 1024:
        raise RuntimeError("Image reference exceeds 20 MiB")
    boundary = "Office" + uuid.uuid4().hex
    data = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{path.name}"\r\n'
            f'Content-Type: {mimetypes.guess_type(path)[0] or "image/png"}\r\n\r\n').encode()
    data += path.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
    request = urllib.request.Request(BASE + "/api/v1/upload", data=data, headers={
        "Authorization": "Bearer " + key, "Content-Type": "multipart/form-data; boundary=" + boundary})
    with urllib.request.build_opener(NoRedirect()).open(request, timeout=90) as response:
        record = data_record(json.load(response))
    url = record.get("file_url") or record.get("upload_url")
    if not url or urllib.parse.urlparse(url).scheme != "https":
        raise RuntimeError("Upload did not return an HTTPS URL")
    return url


def generate(job, key):
    out = Path(job["out"])
    if out.exists():
        print(f"Already saved: {out}", flush=True)
        return
    out.parent.mkdir(parents=True, exist_ok=True)
    metadata_file = out.with_suffix(".generation.json")
    metadata = json.loads(metadata_file.read_text()) if metadata_file.exists() else None
    if metadata:
        record = data_record(metadata["response"])
        generation_id = record.get("generation_id") or record.get("generationId") or record.get("id")
        if not generation_id:
            raise RuntimeError(f"Uncertain previous POST for {out}; inspect saved metadata before resubmitting.")
    else:
        prompt = Path(job["prompt"]).read_text().strip()
        if not 1 <= len(prompt) <= 4000:
            raise RuntimeError(f"Prompt length invalid: {job['prompt']}")
        parameters = {"prompt": prompt, "aspect_ratio": job.get("aspect_ratio", "3:2"),
                      "quality": job.get("quality", "medium"), "output_format": "png"}
        refs = [upload(path, key) for path in job.get("refs", [])]
        if refs:
            parameters["input_images"] = refs
        payload = {"model_id": "openai/gpt-image-2", "parameters": parameters}
        response = api("/api/v1/image/generate", key, payload)
        metadata = {"provider": "bumi", "request": payload, "response": redact(response, key)}
        metadata_file.write_text(json.dumps(metadata, indent=2))
        record = data_record(response)
        generation_id = record.get("generation_id") or record.get("generationId") or record.get("id")
        if not generation_id:
            raise RuntimeError("Missing generation ID; response saved, no paid retry")
    print(f"Submitted/resumed {out.name}: {generation_id}", flush=True)
    deadline = time.monotonic() + 900
    last_status = None
    while time.monotonic() < deadline:
        response = api("/api/v1/generation/" + urllib.parse.quote(str(generation_id), safe=""), key)
        record = data_record(response)
        metadata["last_status_response"] = redact(response, key)
        metadata_file.write_text(json.dumps(metadata, indent=2))
        status = record.get("status")
        if status != last_status:
            print(f"{out.name}: {status}", flush=True)
            last_status = status
        if status == "failed":
            raise RuntimeError(f"Generation failed for {out.name}: {redact(record.get('error'), key)}")
        if status == "completed":
            urls = record.get("resultUrls") or record.get("result_urls") or []
            url = record.get("resultUrl") or record.get("result_url") or (urls[0] if urls else None)
            if not url or urllib.parse.urlparse(url).scheme != "https":
                raise RuntimeError("Missing HTTPS output URL")
            request = urllib.request.Request(url, headers={"User-Agent": "VirtualOffice-Concept/0.1"})
            with urllib.request.urlopen(request, timeout=90) as response:
                image = response.read(30 * 1024 * 1024 + 1)
            if len(image) > 30 * 1024 * 1024 or not image.startswith(b"\x89PNG\r\n\x1a\n"):
                raise RuntimeError("Expected PNG within 30 MiB")
            temporary = out.with_suffix(".download")
            temporary.write_bytes(image)
            temporary.replace(out)
            print(f"Saved: {out}", flush=True)
            return
        time.sleep(12)
    raise RuntimeError(f"Pending {out.name}; run the same batch to resume saved ID.")


if __name__ == "__main__":
    import sys
    key = os.environ.get("BUMI_API_KEY") or getpass.getpass("BUMI_API_KEY (hidden): ")
    try:
        jobs = json.loads(Path(sys.argv[1]).read_text())
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            futures = [pool.submit(generate, job, key) for job in jobs]
            for future in concurrent.futures.as_completed(futures):
                future.result()
    except Exception as error:
        print(redact(str(error), key), file=sys.stderr)
        raise SystemExit(1)
