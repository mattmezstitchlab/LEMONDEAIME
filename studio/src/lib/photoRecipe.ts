/** Non-destructive browser-side photo edit recipes. No external uploads. */
export type CropRatio = "libre" | "1:1" | "4:5" | "9:16" | "16:9";
export interface PhotoRecipe {
  crop: CropRatio;
  centerX: number;
  centerY: number;
  rotation: 0 | 90 | 180 | 270;
  flip: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  grayscale: boolean;
}
export const DEFAULT_RECIPE: PhotoRecipe = {
  crop:"libre", centerX:50,centerY:50,rotation:0,flip:false,
  brightness:100,contrast:100,saturation:100,warmth:0,grayscale:false
};
export const PHOTO_PRESETS = [
  {name:"Original", patch:{brightness:100,contrast:100,saturation:100,warmth:0,grayscale:false}},
  {name:"Lumineux",patch:{brightness:112,contrast:105,saturation:110,warmth:5,grayscale:false}},
  {name:"Doux",patch:{brightness:107,contrast:89,saturation:88,warmth:8,grayscale:false}},
  {name:"Vibrant",patch:{brightness:102,contrast:116,saturation:132,warmth:2,grayscale:false}},
  {name:"Noir & blanc",patch:{brightness:105,contrast:115,saturation:100,warmth:0,grayscale:true}},
] as const;
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
export function cropRect(width:number,height:number,recipe:PhotoRecipe) {
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error("Photo invalide.");
  const ratio=recipe.crop==="libre"?width/height:Number(recipe.crop.split(":")[0])/Number(recipe.crop.split(":")[1]);
  let w=width,h=height;
  if(width/height>ratio)w=height*ratio;else h=width/ratio;
  const x=clamp(width*recipe.centerX/100-w/2,0,width-w);
  const y=clamp(height*recipe.centerY/100-h/2,0,height-h);
  return {x,y,w,h};
}
export function photoDimensions(width:number,height:number,recipe:PhotoRecipe,maxSide=2200) {
  const crop=cropRect(width,height,recipe);
  const rotated=recipe.rotation%180!==0;
  const actualW=rotated?crop.h:crop.w,actualH=rotated?crop.w:crop.h;
  const ratio=Math.min(1,maxSide/Math.max(actualW,actualH));
  return {width:Math.max(1,Math.round(actualW*ratio)),height:Math.max(1,Math.round(actualH*ratio))};
}
export function photoFilter(recipe:PhotoRecipe) {
  return 'brightness('+clamp(recipe.brightness,30,200)+'%) contrast('+clamp(recipe.contrast,40,200)+'%) saturate('+
    clamp(recipe.saturation,0,200)+'%) '+(recipe.grayscale?'grayscale(1) ':'')+'sepia('+Math.max(0,recipe.warmth)/100+')';
}
export function autoLight(data:Uint8ClampedArray):Pick<PhotoRecipe,"brightness"|"contrast"|"saturation"> {
  let sum=0,n=0;
  // Conservative deterministic sampled midtone correction, not AI.
  for(let i=0;i<data.length;i+=4*16){
    const r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
    if(a<128)continue;
    sum+=.2126*r+.7152*g+.0722*b;n++;
  }
  const mean=n?sum/n:128;
  return {brightness:Math.round(clamp(100*128/Math.max(72,mean),85,128)),contrast:105,saturation:105};
}
export function renderPhoto(canvas:HTMLCanvasElement,image:CanvasImageSource,width:number,height:number,recipe:PhotoRecipe,maxSide=2200) {
  const size=photoDimensions(width,height,recipe,maxSide);
  canvas.width=size.width;canvas.height=size.height;
  const ctx=canvas.getContext("2d");
  if(!ctx)throw Error("Canvas indisponible.");
  const crop=cropRect(width,height,recipe);
  ctx.save();
  ctx.translate(size.width/2,size.height/2);
  ctx.rotate(recipe.rotation*Math.PI/180);
  if(recipe.flip)ctx.scale(-1,1);
  const turned=recipe.rotation%180!==0;
  const displayW=turned?size.height:size.width,displayH=turned?size.width:size.height;
  ctx.filter=photoFilter(recipe);
  ctx.drawImage(image,crop.x,crop.y,crop.w,crop.h,-displayW/2,-displayH/2,displayW,displayH);
  ctx.restore();
  return size;
}
