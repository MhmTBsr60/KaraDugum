"""Same-state Surface/PNG evidence. A counter or changed puzzle is not visibility proof."""
from PIL import Image,ImageChops
import json,sys

def measure(before,on,after,rect):
    images=[Image.open(p).convert('RGB').crop(tuple(rect)) for p in [before,on,after]]
    a,b,c=[list(im.getdata()) for im in images]
    n=len(a)
    changed=sum(max(abs(x-y) for x,y in zip(p,q))>24 for p,q in zip(a,b))/n
    gold=sum(q[0]>=210 and q[1]>=150 and q[2]<=150 and q[0]>q[2]+65 and max(abs(x-y) for x,y in zip(p,q))>24 for p,q in zip(a,b))/n
    restored=sum(max(abs(x-y) for x,y in zip(p,q))>8 for p,q in zip(a,c))/n
    return {'changedFraction':changed,'addedGoldFraction':gold,'unrestoredFraction':restored,'visible':changed>.25 and gold>.05 and restored<.02,'method':'same puzzle; added gold + contrast + restoration, not callback counts'}

if __name__=='__main__':
    print(json.dumps(measure(sys.argv[1],sys.argv[2],sys.argv[3],json.loads(sys.argv[4]))))
