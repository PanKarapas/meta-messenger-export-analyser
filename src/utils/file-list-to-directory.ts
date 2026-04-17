export interface Directory {
    name: string,
    children: Array<Directory | File>
}

export function fileListToDirectory(list: FileList): Directory | null {
    if(list.length === 0) {
        return null;
    }
    const result: Directory = {
        name: "dummy",
        children: []
    };

    for(const file of list){
        const pathParts = file.webkitRelativePath.split('/');
        let cwd = result;
        for(let i = 0; i < pathParts.length; i++){
            // If on the last part (file name)
            if(i == pathParts.length-1){
                 cwd.children.push(file);   
                 break;
            }

            let nextSubFolder = cwd.children.find((val) => val.name === pathParts[i] && isDirectory(val)) as Directory | undefined;
            if(!nextSubFolder) {
                nextSubFolder = {
                    name: pathParts[i],
                    children: []
                };
                cwd.children.push(nextSubFolder);
            }

            cwd = nextSubFolder;
        }
    }
    
    return result.children[0] as Directory;
}

export function isDirectory(val: File | Directory): val is Directory {
  return 'children' in val;
}