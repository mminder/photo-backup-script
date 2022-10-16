# photo-backup-script
NodeJs script to backup photos from an import folder to an existing directory recursively while detecting duplicates based on image content.

## tech
NodeJS, Typescript, https://www.npmjs.com/package/blockhash

## usage
```
node index.js -s ./testFolder/import -d ./testFolder/mainImages -dry=true
```
