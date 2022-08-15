import { Thunk, debug } from "./utils";
import { promises as fs } from 'fs';

export class CacheWrapper {
    public static create<T, U extends T & CacheWrapper>(
        item: T,
        thunk: Thunk
    ) {
        const cachingItem = new CacheWrapper(item, thunk);
        for (let method of Object.getOwnPropertyNames(Object.getPrototypeOf(item))) {
            if (method == 'constructor') {
                continue;
            }

            if (item[method].constructor.name === 'AsyncFunction') {
                cachingItem[method] = (...args) => cachingItem.cacheResponse(method, args);
            } else {
                cachingItem[method] = (...args) => cachingItem.nonCacheResponse(method, args);
            }
        }

        return <U>(cachingItem as unknown);
    }

    private constructor(
        private readonly item: Object,
        private readonly thunk: Thunk
    ) { }

    private getCachePath(method: string, args: any[]) {
        return this.thunk([method, ...args].join(".") + ".json");
    }

    private nonCacheResponse(method: string, args: any[]) {
        debug(`Fetching ${[method, ...args].join(".")} uncached`);
        return this.item[method](...args);
    }

    private async cacheResponse(method: string, args: any[]) {
        const cachePath = this.getCachePath(method, args);
        return await (async () => {
            try {
                const contents = await fs.readFile(cachePath);
                debug(`Retrieved cached results from ${cachePath}`)
                return JSON.parse(contents.toString());
            } catch {
                const results = await this.nonCacheResponse(method, args);
                await fs.writeFile(cachePath, JSON.stringify(results));
                return results;
            }
        })();
    }

    public async resetCache(): Promise<void> {
        fs.rmdir(this.thunk(), { recursive: true })
    }
}
