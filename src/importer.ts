import path from "path";
import fs from "fs";
import {detectClashes, hashImageFolder, ImageHashMap} from "./hashUtil";

export async function importer(importImagesPath: string, mainImagesPath: string, dryRun: boolean) {
    const mainFolderImageHashMap = await hashImageFolder(mainImagesPath);
    const importImagesHashMap = await hashImageFolder(importImagesPath);

    warnAboutDestDuplicates(mainFolderImageHashMap);
    const importImagesHashMapWithoutDuplicate = removeDuplicates(importImagesHashMap);

    const clashes = detectClashes(mainFolderImageHashMap, importImagesHashMapWithoutDuplicate);

    const ignoredImages: string[] = [];
    Object.entries(importImagesHashMapWithoutDuplicate).forEach(([hash, images]) => {
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

function removeDuplicates(imageHashMap: ImageHashMap): ImageHashMap {
    const cleanedMap: ImageHashMap = {};

    Object.entries(imageHashMap).forEach(([hash, images]) => {
        if (images.length > 1) {
            console.log(`WARN: import src has duplicates. keeping only first image for import: hash '${hash}' images: \n${images.join('\n')}\n`)
        }
        cleanedMap[hash] = [images[0]]
    });

    return cleanedMap;
}

function warnAboutDestDuplicates(mainFolderImageHashMap: ImageHashMap) {
    Object.entries(mainFolderImageHashMap).forEach(([hash, images]) => {
        if (images.length > 1) {
            console.log(`WARN: import dest has duplicates hash: '${hash}' images:\n${images.join('\n')}\n`);
        }
    });
}

