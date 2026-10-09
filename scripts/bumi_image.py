"""Generate a concept image with the user-selected Bumi API provider.

Secrets are read from BUMI_API_KEY or a hidden terminal prompt and never saved.
The paid POST is issued once; a known generation can be resumed by its ID.
"""

import argparse
import getpass
import json
import os
from pathlib import Path
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = "https://bumi.digital"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def redact(value, key):
    if isinstance(value, dict):
        return {k: redact(v, key) for k, v in value.items() if k.lower() not in {"authorization", "api_key", "token"}}
    if isinstance(value, list):
        return [redact(v, key) for v in value]
    if isinstance(value, str):
        return re.sub(r"bd_[A-Za-z0-9]+", "[redacted]", value.replace(key, "[redacted]"))
    return value


def api(path, key, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(BASE + path, data=data, headers={
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json",
        "User-Agent": "VirtualOffice-Concept/0.1",
    })
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=90) as response:
            body = json.load(response)
    except urllib.error.HTTPError as error:
        detail = error.read(4096).decode(errors="replace")
        raise RuntimeError(f"Bumi HTTP {error.code}: {redact(detail, key)}") from None
    except (TimeoutError, urllib.error.URLError) as error:
        raise RuntimeError(f"Bumi request interrupted; no automatic paid retry: {redact(str(error), key)}") from None
    if body.get("ok") is False:
        raise RuntimeError("Bumi error: " + json.dumps(redact(body, key)))
    return body


def data_record(body):
    record = body.get("data", body)
    if not isinstance(record, dict):
        raise RuntimeError("Unexpected Bumi response shape.")
    return record


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--model", default="openai/gpt-image-2")
    parser.add_argument("--quality", choices=["low", "medium", "high"], default="medium")
    parser.add_argument("--generation-id", help="Resume an existing job without another paid POST")
    parser.add_argument("--aspect-ratio", choices=["1:1", "3:2", "2:3"], default="3:2")
    parser.add_argument("--input-images", nargs="*", default=[], help="HTTPS reference URLs")
    args = parser.parse_args()
    if args.out.exists():
        raise RuntimeError("Output already exists; use a new versioned filename.")
    prompt = args.prompt.read_text().strip()
    if not 1 <= len(prompt) <= 4000:
        raise RuntimeError("Prompt must contain 1 to 4000 characters.")
    key = os.environ.get("BUMI_API_KEY") or getpass.getpass("BUMI_API_KEY (hidden): ")
    if not key:
        raise RuntimeError("BUMI_API_KEY is empty.")
    args.out.parent.mkdir(parents=True, exist_ok=True)
    metadata_path = args.out.with_suffix(".generation.json")
    payload = {"model_id": args.model, "parameters": {
        "prompt": prompt, "aspect_ratio": args.aspect_ratio, "quality": args.quality, "output_format": "png"
    }}
    if args.input_images:
        if any(urllib.parse.urlparse(url).scheme != "https" for url in args.input_images):
            raise RuntimeError("Reference URLs must use HTTPS.")
        payload["parameters"]["input_images"] = args.input_images
    generation_id = args.generation_id
    if not generation_id:
        response = api("/api/v1/image/generate", key, payload)
        record = data_record(response)
        generation_id = record.get("generation_id") or record.get("generationId") or record.get("id")
        metadata = {"provider": "bumi", "request": payload, "response": redact(response, key)}
        metadata_path.write_text(json.dumps(metadata, indent=2))
        if not generation_id:
            raise RuntimeError("No generation ID returned. Response saved; do not blindly submit again.")
    else:
        metadata = {"provider": "bumi", "generation_id": generation_id, "resumed": True}
    print(json.dumps({"generation_id": generation_id, "model": args.model, "status": "submitted"}), flush=True)
    deadline = time.monotonic() + 900
    last_status = None
    while time.monotonic() < deadline:
        response = api("/api/v1/generation/" + urllib.parse.quote(str(generation_id), safe=""), key)
        record = data_record(response)
        status = record.get("status")
        metadata["last_status_response"] = redact(response, key)
        metadata_path.write_text(json.dumps(metadata, indent=2))
        if status != last_status:
            print(json.dumps({"generation_id": generation_id, "status": status}), flush=True)
            last_status = status
        if status == "failed":
            raise RuntimeError("Generation failed: " + str(redact(record.get("error"), key)))
        if status == "completed":
            urls = record.get("resultUrls") or record.get("result_urls") or []
            url = record.get("resultUrl") or record.get("result_url") or (urls[0] if urls else None)
            if not url or urllib.parse.urlparse(url).scheme != "https":
                raise RuntimeError("Completed generation has no HTTPS result URL.")
            # Result files are fetched independently without the API credential.
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent":"VirtualOffice-Concept/0.1"}), timeout=60) as result:
                image = result.read(30 * 1024 * 1024 + 1)
            if len(image) > 30 * 1024 * 1024 or not image.startswith(b"\x89PNG\r\n\x1a\n"):
                raise RuntimeError("Output is not a PNG within the 30 MiB limit.")
            temporary = args.out.with_suffix(".download")
            temporary.write_bytes(image)
            temporary.replace(args.out)
            print(json.dumps({"status":"saved", "out":str(args.out.resolve()), "bytes":len(image)}), flush=True)
            return
        time.sleep(12)
    raise RuntimeError(f"Generation still pending after 15 minutes. Resume with --generation-id {generation_id}.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
