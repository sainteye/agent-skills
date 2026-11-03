import math, random, struct, wave
SR=48000; N=SR*30
L=[0.0]*N
random.seed(7)
def add(t0, dur, fn, g=1.0):
    i0=int(t0*SR); n=int(dur*SR)
    for k in range(n):
        i=i0+k
        if 0<=i<N: L[i]+=g*fn(k/SR)
def kick(t,g=1.0):
    def f(x):
        ph=2*math.pi*(45*x+ (150-45)*(1-math.exp(-x*30))/30)
        return math.sin(ph)*math.exp(-x*9)
    add(t,.45,f,g)
def noise_hit(t,dur=.08,g=.3,bright=.9):
    st={'p':0.0}
    def f(x):
        n=random.uniform(-1,1); y=n-bright*st['p']; st['p']=n
        return y*math.exp(-x/dur*4)
    add(t,dur*1.2,f,g)
def tone(t,freq,dur,g=.2,dec=8,shape='sin',sweep=0):
    def f(x):
        fr=freq*(1+sweep*x)
        ph=2*math.pi*fr*x
        v=math.sin(ph) if shape=='sin' else (math.sin(ph)+.5*math.sin(2*ph)+.33*math.sin(3*ph)+.25*math.sin(4*ph))*.55
        a=min(1,x/.004)*math.exp(-x*dec)
        return v*a
    add(t,dur,f,g)
def whoosh(t,dur,g=.25,up=True):
    st={'lp':0.0}
    def f(x):
        u=x/dur; c=(.02+.25*u) if up else (.27-.25*u)
        st['lp']+=c*(random.uniform(-1,1)-st['lp'])
        env=math.sin(math.pi*min(1,u))**2
        return st['lp']*env*3
    add(t,dur,f,g)
def pad(t,dur,freqs,g=.05,att=.4,rel=1.0):
    def f(x):
        a=min(1,x/att)*min(1,max(0,(dur-x)/rel))
        v=0
        for fr in freqs:
            for d in (-.6,.6):
                ph=(fr+d)*x%1.0; v+=(2*ph-1)
        return v*a/len(freqs)/2
    add(t,dur,f,g)
# --- S1
for i in range(6): noise_hit(.3+i*.09,.02,.35,.95); tone(.3+i*.09,1800,.03,.04)
for i in range(13): tone(1.05+i*.07,2400+i*40,.04,.025,40)
rnd=random.Random(3)
for i in range(23): tone(1.3+rnd.random()*.75,600+rnd.random()*900,.12,.05,30)
whoosh(1.1,1.6,.18)
kick(2.5,.6); pad(2.5,1.5,[55,110,82.4],.08,.05,.3)
whoosh(3.2,.8,.22)
for i in range(16): tone(3.25+i*.047,880+i*55,.05,.03,40)
# --- S2 hits
notes=[220,233,261,293,329,349,415]
for i in range(7):
    t=4+i*.25; kick(t,.9); noise_hit(t,.12,.35,.6); tone(t,notes[i],.22,.12,10,'saw'); tone(t,notes[i]*2,.15,.05,14,'saw')
tone(5.8,1760,.12,.12,20)
# --- S3
tone(6.0,220,.5,.12,4,'sin',3.0); whoosh(5.95,.55,.2)
for j in range(24):
    t=6.38+j*.034+.3; tone(t,440*2**((j%12)/12)*(1 if j<12 else 2),.08,.06,35); noise_hit(t,.02,.08)
kick(7.5,1.2); noise_hit(7.5,.6,.25,.3); tone(7.5,55,1.8,.35,1.6)
pad(7.5,2.5,[110,164.8,220,261.6],.07,.3,1.2)
for i in range(9): tone(8.2+i*.04,1320+i*30,.03,.02,50)
tone(9.0,1568,.15,.08,18); tone(9.11,2093,.15,.06,18)
whoosh(9.4,.62,.35); 
# --- groove 10..26
prog=[(110,[220,261.6,329.6]),(87.3,[174.6,220,261.6]),(65.4,[261.6,329.6,392]),(98,[196,246.9,293.7])]
for b in range(32):
    t=10+b*.5; kick(t,.85)
    noise_hit(t+.25,.03,.12,.95); 
    if b%2==1: noise_hit(t,.09,.18,.5)
    root,ch=prog[(b//4)%4]
    tone(t,root,.45,.16,5,'saw'); tone(t+.25,root*2,.2,.05,10,'saw')
for k in range(8):
    root,ch=prog[k%4]; pad(10+k*2,2.0,ch,.035,.15,.3)
for t in (13.62,17.62,21.62,25.6): whoosh(t,.55,.3)
tone(12.0,1318,.4,.07,6); tone(12.1,1760,.4,.06,6)
noise_hit(12.9,.015,.2,.98); tone(12.9,2600,.02,.05,80)
tone(13.05,880,.2,.06,12); tone(15.0,660,.12,.05,15); tone(15.95,520,.1,.04,15)
whoosh(16.95,.35,.15)
for i,t in enumerate([19.34,19.76,20.18,20.6,21.02]): tone(t,523.25*2**([0,2,4,7,12][i]/12),.3,.09,9,'saw')
for i in range(10): tone(21.02+i*.03,1500+i*170,.08,.03,30)
for i in range(6): tone(23.15+i*.27,1200,.05,.03,40)
noise_hit(24.9,.015,.2,.98)
# --- S8
whoosh(25.9,.5,.25)
for i in range(24): tone(26.3+(i%8)*.045,660*2**((i%8)/12),.08,.04,30)
kick(27.0,1.3); noise_hit(27.0,.7,.25,.3); tone(27.0,55,2.8,.35,1.0)
pad(27.0,3.0,[110,220,277.2,329.6,440],.08,.2,1.6)
tone(28.7,1568,.2,.07,12); tone(28.82,2093,.25,.06,10)
# reverb-ish echo + master
out=L[:]
for d,g in ((int(.113*SR),.25),(int(.197*SR),.18),(int(.291*SR),.12)):
    for i in range(d,N): out[i]+=L[i-d]*g
pk=max(abs(v) for v in out); g=.89/pk
for i in range(N):
    fo=min(1,(30-i/SR)/.45)
    out[i]=math.tanh(out[i]*g*1.2)*fo
w=wave.open('audio.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
w.writeframes(b''.join(struct.pack('<h',int(max(-1,min(1,v))*32000)) for v in out)); w.close()
print('ok')
