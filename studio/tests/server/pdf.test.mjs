import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {jsPDF} from 'jspdf';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
test('PDF.js 6 parses actual exported PDF pages/text and destroys its loading task',async()=>{
 const source=new jsPDF();source.text('AIME PDF regression',20,20);source.addPage();source.text('Second page',20,20);
 const task=getDocument({data:new Uint8Array(source.output('arraybuffer')),standardFontDataUrl:path.resolve('node_modules/pdfjs-dist/standard_fonts')+path.sep});
 try{const doc=await task.promise;assert.equal(doc.numPages,2);const page=await doc.getPage(1);
 assert((await page.getTextContent()).items.some(item=>item.str==='AIME PDF regression'));assert(page.getViewport({scale:1}).width>0);
 }finally{await task.destroy();}
});
