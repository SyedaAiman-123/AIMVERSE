"""Documentary-style treatment for the owner's voiceovers: clean + warm the voice, add a soft generated ambient bed that fades in before and out after
each line (ducked under the voice), normalise loudness, export MP3.  usage: python make_voiceovers.py <raw_dir> <out_dir>"""
import os, subprocess, sys, glob
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

RAW, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
SR, LEAD, TAIL = 48000, 0.9, 2.6

BPM=100; BEAT=60/BPM
def env_exp(n,tau): return np.exp(-np.arange(n)/SR/tau)
def bed(total, d, seed=3):
    """energetic documentary / ad-style bed: riser into an impact on the first word, driving 100 bpm pulse (kick, off-beat hats, sub-bass, arpeggio plucks, pad) in A minor,
    a swell and a final hit just after the line ends. Stereo, generated here (no samples, nothing licensed)."""
    rng=np.random.default_rng(seed); N=int(total*SR); L=np.zeros((2,N)); t0=LEAD; vend=LEAD+d
    def add(sig,at,gl=1.0,gr=1.0):
        i=int(at*SR)
        if i>=N or i<0: return
        m=min(len(sig),N-i); L[0,i:i+m]+=sig[:m]*gl; L[1,i:i+m]+=sig[:m]*gr
    def noise(n): return rng.standard_normal(n)
    # riser before the first word
    n=int(t0*SR); r=noise(n); r=sosfilt(butter(2,[800,7000],'bandpass',fs=SR,output='sos'),r)*np.linspace(0,1,n)**2.2*.5; add(r,0)
    # impact on the first word: sub boom + noise burst
    n=int(1.4*SR); tt=np.arange(n)/SR; boom=np.sin(2*np.pi*(46+60*np.exp(-tt*9))*tt)*np.exp(-tt*3.2)*1.0; add(boom,t0)
    add(sosfilt(butter(2,3000,'lowpass',fs=SR,output='sos'),noise(n))*np.exp(-tt*6)*.5,t0)
    chords=[(55,[220,261.63,329.63]),(43.65,[174.61,220,261.63]),(65.41,[261.63,329.63,392]),(49,[196,246.94,293.66])]
    step=BEAT/4; k=0; t=t0
    while t<vend+0.4:
        beat=int(round((t-t0)/BEAT*4))   # 16th index
        bar=(beat//16)%4; root,ch=chords[bar]; sx=beat%16
        if sx%4==0:   # kick on every beat
            n=int(.3*SR); tt=np.arange(n)/SR; add(np.sin(2*np.pi*(48+95*np.exp(-tt*28))*tt)*np.exp(-tt*9)*.8,t)
        if sx%4==2:   # off-beat hat
            n=int(.05*SR); add(sosfilt(butter(2,7500,'highpass',fs=SR,output='sos'),noise(n))*env_exp(n,.012)*.22,t,.9,1.1)
        if sx in (4,12):   # snare-ish clap
            n=int(.18*SR); add(sosfilt(butter(2,[1200,6000],'bandpass',fs=SR,output='sos'),noise(n))*env_exp(n,.05)*.28,t)
        if sx%2==0:   # driving eighth bass
            n=int(BEAT*.5*SR); tt=np.arange(n)/SR; f=root*(2 if sx%8==6 else 1)
            b=sosfilt(butter(2,300,'lowpass',fs=SR,output='sos'),2*((tt*f)%1)-1)*np.exp(-tt*5)*.55; add(b,t)
        if rng.random()<.8:   # 16th arpeggio pluck, panned around
            n=int(.45*SR); tt=np.arange(n)/SR; f=ch[(sx*3)%3]*(2 if sx%4==3 else 1); pan=.5+.4*np.sin(beat*.9)
            p=(np.sin(2*np.pi*f*tt)+.35*np.sin(4*np.pi*f*tt))*np.exp(-tt*7)*.16; add(p,t,1-pan*.6,.4+pan*.6)
        t+=step
    # pad swells with each bar
    bt=t0
    while bt<vend+0.5:
        bar=int((bt-t0)/(BEAT*4))%4; n=int(BEAT*4*SR); tt=np.arange(n)/SR
        for f in chords[bar][1]:
            for dt in (-.5,.5): add(np.sin(2*np.pi*(f/2+dt)*tt)*np.minimum(1,tt/.4)*np.minimum(1,(BEAT*4-tt)/.4)*.05,bt)
        bt+=BEAT*4
    # swell + final hit just after the line ends
    n=int(1.1*SR); sw=sosfilt(butter(2,[1500,9000],'bandpass',fs=SR,output='sos'),noise(n))*np.linspace(0,1,n)**2*.45; add(sw,vend-.2)
    n=int(1.8*SR); tt=np.arange(n)/SR; add(np.sin(2*np.pi*(44+50*np.exp(-tt*10))*tt)*np.exp(-tt*2.4)*.9,vend+.9)
    # a touch of width/echo
    d1=int(BEAT*.75*SR); e=np.zeros_like(L); e[:,d1:]=L[:,:-d1]*.28; L+=e
    L=sosfilt(butter(2,9500,'lowpass',fs=SR,output='sos'),L,axis=1); L/=max(1e-9,np.abs(L).max())
    return (L.T*0.8*32767).astype(np.int16)

def dur(p):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).decode().strip())

for src in sorted(glob.glob(os.path.join(RAW, '*.aac'))):
    name = os.path.basename(src).split('.')[0]
    d = dur(src); total = LEAD + d + TAIL
    bedwav = os.path.join(OUT, '_bed.wav'); wavfile.write(bedwav, SR, bed(total, d))
    voice = ('pan=mono|c0=0.5*c0+0.5*c1,afftdn=nr=12:nf=-45,highpass=f=85,equalizer=f=180:t=q:w=1:g=2.5,equalizer=f=3200:t=q:w=1:g=1.8,'
             'acompressor=threshold=-24dB:ratio=3:attack=8:release=140:makeup=4,aecho=0.85:0.6:55|110:0.16|0.08,'
             f'loudnorm=I=-16:TP=-1.5:LRA=7,adelay={int(LEAD*1000)}:all=1,apad=whole_dur={total:.3f},aformat=channel_layouts=stereo')
    # voice -> both channels; bed ducked by the voice, faded in/out
    fc = (f'[0:a]{voice},asplit=2[v][sc];'
          f'[1:a]atrim=0:{total:.3f},volume=0.42,afade=t=out:st={total-1.1:.3f}:d=1.1[b];'
          '[b][sc]sidechaincompress=threshold=0.02:ratio=7:attack=15:release=350[bd];'
          '[v][bd]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.89')
    out = os.path.join(OUT, name + '.mp3')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', src, '-i', bedwav, '-filter_complex', fc, '-ar', '44100', '-b:a', '112k', out], check=True)
    print(name, round(total, 2), 's')
os.remove(bedwav)
