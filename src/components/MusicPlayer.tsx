import {useEffect,useRef,useState} from 'react';
import {Music2,Pause,Play,SkipForward,Volume2,VolumeX} from 'lucide-react';

type Track={title:string;file:string};

const tracks:Track[]=[
 {title:'Cozy Workflow',file:'/assets/audio/lofi/Cozy%20Workflow.mp3'},
 {title:'Gentle Nudge',file:'/assets/audio/lofi/Gentle%20Nudge.mp3'},
 {title:'Gentle Nudge 01',file:'/assets/audio/lofi/Gentle%20Nudge%20(1).mp3'},
 {title:'Midnight Syntax',file:'/assets/audio/lofi/Midnight%20Syntax.mp3'},
 {title:'Midnight Syntax 01',file:'/assets/audio/lofi/Midnight%20Syntax%20(1).mp3'},
 {title:'Soft Focus',file:'/assets/audio/lofi/Soft%20Focus.mp3'},
 {title:'Soft Focus 01',file:'/assets/audio/lofi/Soft%20Focus%20(1).mp3'},
 {title:'Soft Focus 02',file:'/assets/audio/lofi/Soft%20Focus%20(2).mp3'},
];

export default function MusicPlayer(){
 const audio=useRef<HTMLAudioElement|null>(null);
 const [trackIndex,setTrackIndex]=useState(0),[playing,setPlaying]=useState(false),[muted,setMuted]=useState(false),[available,setAvailable]=useState(true);
 const track=tracks[trackIndex];
 useEffect(()=>{
  const player=audio.current;
  if(!player)return;
  let cancelled=false;
  player.src=track.file;
  player.load();
  player.volume=.38;
  player.muted=muted;
  setAvailable(true);
  if(playing)void player.play().catch(()=>{if(!cancelled)setPlaying(false)});
  return()=>{cancelled=true;player.pause()};
 },[track.file]);
 useEffect(()=>{if(audio.current)audio.current.muted=muted},[muted]);
 const togglePlay=()=>{
  const player=audio.current;
  if(!player)return;
  if(playing){player.pause();setPlaying(false);return;}
  void player.play().then(()=>setPlaying(true)).catch(()=>setPlaying(false));
 };
 const nextTrack=()=>setTrackIndex(index=>(index+1)%tracks.length);
 return <div className="music-player" aria-label="Pemutar musik kantor">
  <audio ref={audio} loop preload="metadata" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onCanPlay={()=>setAvailable(true)} onError={()=>{setAvailable(false);setPlaying(false)}}/>
  <span className="music-player-icon" aria-hidden="true"><Music2 size={13}/></span>
  <span className="music-player-title" aria-live="polite" title={available?track.title:'File musik tidak tersedia'}>{available?track.title:'Musik tidak tersedia'}</span>
  <button className="music-control" type="button" onClick={togglePlay} disabled={!available} aria-label={playing?'Jeda musik':'Putar musik'} title={playing?'Jeda':'Putar'}>{playing?<Pause size={13}/>:<Play size={13}/>}</button>
  <button className={`music-control ${muted?'active':''}`} type="button" onClick={()=>setMuted(value=>!value)} disabled={!available} aria-label={muted?'Nyalakan suara':'Senyapkan musik'} title={muted?'Nyalakan suara':'Mute'}>{muted?<VolumeX size={13}/>:<Volume2 size={13}/>}</button>
  <button className="music-control" type="button" onClick={nextTrack} aria-label="Lagu berikutnya" title="Lagu berikutnya"><SkipForward size={13}/></button>
 </div>;
}
