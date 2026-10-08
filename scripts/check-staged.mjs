import{execFileSync}from'node:child_process';
const args=['-c',`safe.directory=${process.cwd().replaceAll('\\','/')}`],git=(...a)=>execFileSync('git',[...args,...a],{encoding:'utf8',maxBuffer:16*1024*1024});
const ref=process.argv[2],files=(ref?git('diff-tree','--no-commit-id','--name-only','--diff-filter=ACMR','-r',ref):git('diff','--cached','--name-only','--diff-filter=ACMR')).trim().split('\n').filter(Boolean),findings=[];
for(const file of files){
 if(/(^|\/)(\.env(?:\..*)?|credentials.*\.json|service-account.*\.json)$|\.(pem|key|p12|pfx)$/i.test(file))findings.push({file,reason:'sensitive file type'});
 if(/\.(png|mp3)$/.test(file))continue; // Original baked PNGs/unchanged public music, not imported private media.
 const content=git('show',`${ref??''}:${file}`);
 if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AIza[0-9A-Za-z_-]{30,}/.test(content))findings.push({file,reason:'credential pattern'});
 if(/C:[\\/]+Users[\\/]|\/Users\/[A-Za-z]|\/home\/[A-Za-z]/.test(content))findings.push({file,reason:'private local path'});
}
console.log(JSON.stringify({reviewedFiles:files.length,findings},null,2));if(findings.length)process.exitCode=1;
