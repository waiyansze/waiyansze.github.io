# Re-trace the hero Flowers sketch into hero-sketch.js.
# Usage (from repo root): pip install numpy scipy scikit-image pillow
#   python3 tools/trace-hero-sketch.py
# Edit the waypoints in S (image pixels of tools/hero-sketch-source.png) to
# change a stroke; HAND_TIMING in site.js sets when each stroke is drawn.
import numpy as np
from PIL import Image
from skimage.morphology import skeletonize
from scipy.ndimage import distance_transform_edt
_im=Image.open('tools/hero-sketch-source.png').convert('RGBA'); _bg=Image.new('RGBA',_im.size,(255,255,255,255)); _bg.alpha_composite(_im)
_ink=np.array(_bg.convert('L'))<128
np.save('/tmp/sk.npy',skeletonize(_ink)); np.save('/tmp/dt.npy',distance_transform_edt(_ink))
"""Trace Wai's branch sketch into ordered, variable-width strokes.
Waypoints are placed by hand along each drawn line (image pixels); between
them the path follows the sketch's own skeleton, so the hand's wobble is
kept. Width comes from the ink's distance transform (real pen pressure)."""
import numpy as np, json
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra
from scipy.spatial import cKDTree
from scipy.ndimage import gaussian_filter1d
sk=np.load('/tmp/sk.npy'); dt=np.load('/tmp/dt.npy')
ys,xs=np.nonzero(sk); idx=-np.ones(sk.shape,int); idx[ys,xs]=np.arange(len(xs))
r,c,w=[],[],[]
for dy,dx in [(0,1),(1,0),(1,1),(1,-1)]:
    y2,x2=ys+dy,xs+dx; ok=(y2<sk.shape[0])&(x2>=0)&(x2<sk.shape[1]); ok[ok]&=sk[y2[ok],x2[ok]]
    r+=list(idx[ys[ok],xs[ok]]); c+=list(idx[y2[ok],x2[ok]]); w+=[np.hypot(dy,dx)]*ok.sum()
G=coo_matrix((w,(r,c)),shape=(len(xs),)*2).tocsr(); tree=cKDTree(np.c_[xs,ys])

S = {  # name: waypoints, in drawing order
 'stand':  [(1042,1305),(1042,1372),(1090,1372),(1086,1450),(1087,1515),(1130,1517),(1167,1515),(1172,1420),(1175,1353)],
 'leg':    [(1187,1340),(1186,1430),(1185,1515),(1225,1515),(1226,1460),(1254,1460),(1252,1405),(1225,1405),(1228,1370),(1232,1322)],
 'vessel': [(1225,1142),(1102,1162),(1000,1174),(997,1230),(1002,1280),(1025,1305),(1050,1305),(1075,1290),(1100,1258)],
 'vessel2':[(1225,1142),(1215,1180),(1210,1210),(1217,1250),(1245,1280),(1272,1305)],
 'knot':   [(1100,1225),(1150,1222),(1178,1235),(1160,1255),(1120,1262),(1075,1255),(1063,1240),(1085,1227),(1100,1225),(1110,1250),(1150,1275),(1200,1293),(1250,1305)],
 'trunk':  [(1105,1250),(1100,1200),(1102,1150),(1085,1095),(1070,1050),(1062,990),(1075,920),(1100,890),(1112,860),(1130,835),(1138,800),(1137,772),(1125,768),(1080,782),(1035,787),(1015,778),(1005,752),(1012,725),(1035,690),(1070,660),(1095,640),(1105,600),(1110,550),(1112,512),(1090,512),(1050,528),(1000,538),(985,530),(978,500),(982,460),(995,430),(1010,410),(1035,392),(1060,378),(1100,352),(1150,322),(1200,298),(1235,282)],
 'trunk2': [(1100,1085),(1092,1030),(1085,1010),(1090,985),(1100,960),(1105,905),(1125,890),(1140,865),(1160,830),(1165,790),(1162,750),(1125,752),(1090,760),(1053,773),(1042,770),(1045,745),(1065,712),(1085,690),(1110,652),(1126,630),(1128,590),(1140,565),(1143,540),(1140,500),(1130,490),(1090,500),(1050,510),(1020,522),(1002,520),(1003,480),(1015,450),(1040,425),(1070,398),(1100,375),(1140,345)],
 'twig':   [(1060,985),(1045,950),(1027,927),(1015,905),(1008,885),(1020,885),(1015,905),(995,905),(1015,912),(1045,897),(1030,905),(1015,925),(990,952)],
 'twig2':  [(1090,975),(1120,930),(1150,905),(1165,890),(1185,875),(1210,870),(1200,880),(1165,900),(1180,935),(1175,950),(1160,935)],
 'spray':  [(1005,412),(990,405),(975,415),(960,420),(945,418),(935,415)],
 'spray2': [(978,497),(950,485),(925,488),(905,500),(885,512)],
 'tip':    [(1230,282),(1245,250),(1258,235),(1250,260),(1235,280),(1270,272),(1282,275)],
 'rose':   [(1102,1150),(1112,1130),(1130,1115),(1160,1105),(1170,1095),(1180,1105),(1165,1120),(1145,1110),(1150,1085),(1180,1078),(1195,1100),(1190,1125),(1160,1137),(1135,1120),(1130,1090),(1160,1070)],
 'stem':   [(1195,1090),(1230,1092),(1265,1085),(1295,1062),(1315,1027),(1350,1017),(1395,1015),(1408,1017),(1418,995),(1425,1010),(1445,1017),(1420,1030),(1410,1045),(1400,1030),(1385,1030)],
 'bud':    [(1352,1015),(1350,995),(1375,975),(1397,951),(1385,970)],
}
def path(a,b):
    ia=tree.query(a)[1]; ib=tree.query(b)[1]
    d,pred=dijkstra(G,directed=False,indices=ia,return_predecessors=True,limit=3*np.hypot(a[0]-b[0],a[1]-b[1])+60)
    if not np.isfinite(d[ib]): return None
    out=[ib]
    while out[-1]!=ia: out.append(pred[out[-1]])
    return [(xs[i],ys[i]) for i in out[::-1]]
REG={ # leftover scribbles (blossoms, petals) walked in place, appended to a stroke
 'twig':(985,870,1052,962),'twig2':(1105,855,1232,962),'spray':(922,388,1020,438),'spray2':(862,468,992,532),
 'tip':(1212,222,1292,298),'rose':(1122,1062,1202,1142),'stem':(1372,982,1458,1052),'trunk2':(1138,318,1168,372)}
def walk(name,covered):
    x0,y0,x1,y1=REG[name]
    sel=np.nonzero((xs>=x0)&(xs<=x1)&(ys>=y0)&(ys<=y1))[0]
    if covered is not None and len(covered):
        dd,_=cKDTree(covered).query(np.c_[xs[sel],ys[sel]]); sel=sel[dd>4]
    left=set(sel.tolist()); out=[]; cur=np.array(covered[-1]) if len(covered) else None
    while left:
        L=np.array(sorted(left)); st=L[np.argmin(np.hypot(xs[L]-cur[0],ys[L]-cur[1]))] if cur is not None else L[0]
        stack=[st]; first=True
        while stack:
            i=stack.pop()
            if i not in left: continue
            if out and np.hypot(xs[i]-out[-1][0],ys[i]-out[-1][1])>2.5: out.append((out[-1][0],out[-1][1],0)); out.append((xs[i],ys[i],0))
            left.discard(i); out.append((xs[i],ys[i],2*dt[ys[i],xs[i]]))
            for j in G.getrow(i).indices.tolist()+G.T.getrow(i).indices.tolist():
                if j in left: stack.append(j)
        cur=np.array(out[-1][:2])
    return out
res={}; gaps=[]
for name,wp in S.items():
    pts=[]
    for a,b in zip(wp,wp[1:]):
        p=path(a,b)
        if p is None:
            gaps.append((name,a,b)); ia=tree.query(a)[1]; ib=tree.query(b)[1]
            p=[(xs[ia],ys[ia],0),(xs[ib],ys[ib],0)]   # pen lifted: zero width
        pts+= [q if len(q)==3 else (q[0],q[1],2*dt[q[1],q[0]]) for q in p]
    if name in REG: pts+= [(pts[-1][0],pts[-1][1],0)] + walk(name,np.array([p[:2] for p in pts]))
    P=np.array(pts,float)
    P[:,:2]=gaussian_filter1d(P[:,:2],2.5,axis=0,mode='nearest'); z=P[:,2]==0; P[:,2]=gaussian_filter1d(P[:,2],3,mode='nearest'); P[z,2]=0
    # resample every 7 px
    d=np.r_[0,np.cumsum(np.hypot(*np.diff(P[:,:2],axis=0).T))]; t=np.arange(0,d[-1],7.0)
    Q=np.c_[np.interp(t,d,P[:,0]),np.interp(t,d,P[:,1]),np.interp(t,d,P[:,2])]; Q[np.interp(t,d,z.astype(float))>0,2]=0
    n=len(Q); ramp=np.minimum(1,np.minimum(np.arange(n),n-1-np.arange(n))/max(2,n*.06)); Q[:,2]*=.35+.65*ramp
    res[name]=Q
print('gaps',gaps)
# 100-unit space: sketch height -> 84 units, vessel centre (1135) -> x 47
K=84/1297; ox=47-1135*K; oy=8-227*K
out=[]
for name,Q in res.items():
    out.append({'name':name,'pts':[v for x,y,w in Q for v in (round((x*K+ox)*10),round((y*K+oy)*10),round(w*K*100))]})
lines=["/* Hero · Flowers: traced from Wai's own ink sketch (a branch in a vessel on a stand).",
" Each stroke is a flat list of x, y, width in the hero's 100 × 100 space",
" (x and y × 10, width × 100). Width 0 = the pen is lifted. Strokes are in",
" drawing order: stand and vessel first (ruled, controlled), then the branch,",
" then the quick marks: twigs, blossoms, the rose and the side stem.",
" Generated by tools/trace-hero-sketch.py. */","window.HERO_SKETCH = {"]
for o in out: lines.append(f"  {o['name']}: [{','.join(map(str,o['pts']))}],")
open('hero-sketch.js','w').write('\n'.join(lines)+'\n};\n')
print({o['name']:len(o['pts'])//3 for o in out}, sum(len(o['pts']) for o in out)//3)
