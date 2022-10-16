import path from "path";
import fs from "fs";
import {detectClashes, findDuplicates, hashImageFolder} from "./hashUtil";

export async function importer(importImagesPath: string, mainImagesPath: string, dryRun: boolean) {
    const mainFolderImageHashMap = await hashImageFolder(mainImagesPath);
    const importImagesHashMap = await hashImageFolder(importImagesPath);

    const clashes = detectClashes(mainFolderImageHashMap, importImagesHashMap);

    const importDuplicates = findDuplicates(importImagesHashMap);
    const mainDuplicates = findDuplicates(mainFolderImageHashMap);

    if (Object.keys(importDuplicates).length > 0) {
        // remove duplicates from import
        Object.keys(importDuplicates).forEach(duplicateHash => {
            const imagesWithDuplicates = importImagesHashMap[duplicateHash];
            console.log(`WARN: import src has duplicates. keeping only first image for import: hash '${duplicateHash}' images: \n${imagesWithDuplicates.join('\n')}\n`)
            importImagesHashMap[duplicateHash] = [imagesWithDuplicates[0]];
        });
    }

    Object.entries(mainDuplicates).forEach(([hash, images])=>{
        console.log(`WARN: import dest has duplicates hash: '${hash}' images:\n${images.join('\n')}\n`);
    });

    const ignoredImages: string[] = [];
    Object.entries(importImagesHashMap).forEach(([hash, images]) => {
        if (images.length > 1) {
            throw new Error(`hash '${hash}' has multiple images '${images}'`);
        } else if (clashes.some(clash => clash.hash === hash)) {
            // do not import, is clash and already exists in main
            ignoredImages.push(images[0]);
        } else {
            // copy file
            const srcImg = images[0];
            const relativeSrcPath = path.relative(importImagesPath, srcImg);
            const dstPath = path.join(mainImagesPath, relativeSrcPath);

            if (!dryRun) {
                console.log(`copy ${srcImg} to ${dstPath}`);
                fs.copyFileSync(srcImg, dstPath);
            } else {
                console.log(`DRY RUN copy ${srcImg} to ${dstPath}`);
            }
        }
    });

    console.log(`\nsome images were not copied because they were already in dest folder:\n${ignoredImages.join('\n')}\n`);
}
