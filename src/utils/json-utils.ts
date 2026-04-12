export function stringifyMapReplacer(_: string, value: any): any {
    if(value instanceof Map){
        return {
            __type: "Map",
            entries: [...value.entries()]
        };
    }

    return value;
}

export function parseMapReplacer(_: string, value: any): any {
    if(value.__type === "Map") {
        const result = new Map();
        for(const entry of value.entries) {
            result.set(entry[0], entry[1]);
        }
        return result;
    }
    return value;
}