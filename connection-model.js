/* Read-only physical links from the engine's current masks. Never reads DOM positions,
   solution masks, inventory or storage. This is the same reciprocal-port rule as countValid(). */
(function(root){'use strict';
 const dirs=[[1,-1,0,4],[2,0,1,8],[4,1,0,1],[8,0,-1,2]];
 function graph(values,n,hidden=[]){
  if(!Number.isInteger(n)||n<1||values.length!==n*n)return {edges:[],ports:[],ranks:[]};
  const ports=values.map(()=>0),edges=[],adj=values.map(()=>[]);
  for(let a=0;a<values.length;a++)for(const [bit,dr,dc,opp] of dirs){
   if(!(values[a]&bit))continue;const rr=Math.floor(a/n)+dr,cc=a%n+dc,b=rr*n+cc;
   if(rr<0||cc<0||rr>=n||cc>=n||!(values[b]&opp)||hidden[a]||hidden[b])continue;
   ports[a]|=bit;if(a<b){edges.push({id:a+':'+b,a,b,bit,opp});adj[a].push(b);adj[b].push(a);}
  }
  // BFS per connected component; cosmetic wave ordering, not a new win condition.
  const ranks=values.map(()=>-1);let maxRank=0;
  for(let start=0;start<values.length;start++)if(ports[start]&&ranks[start]<0){
   const queue=[start];ranks[start]=0;for(let k=0;k<queue.length;k++){const a=queue[k];for(const b of adj[a])if(ranks[b]<0){ranks[b]=ranks[a]+1;maxRank=Math.max(maxRank,ranks[b]);queue.push(b);}}
  }
  return {edges,ports,ranks,maxRank};
 }
 const api=Object.freeze({graph});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.kdConnectionModel=api;
})(typeof window==='undefined'?globalThis:window);
