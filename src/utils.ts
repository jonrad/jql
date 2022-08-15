// who doesn't love a utils file /s
import { appendFileSync, fstatSync } from 'fs';

declare global {
    interface Array<T> {
        distinct(): Array<T>;
    }

}

Array.prototype.distinct = function () {
    return Array.from(new Set(this).values());
};

// these are silly
var consoleDebug = false;
var fileDebug = false;
export function enableConsoleDebug() {
    consoleDebug = true;
}

export function enableFileDebug() {
    fileDebug = true;
}

export function debug(text: any) {
    if (consoleDebug) {
        console.log(`${text}\n`);
    } else if (fileDebug) {
        appendFileSync('/tmp/jql-debug', `${text}\n`);
    }
}

export type Thunk = (...paths: string[]) => string;

const escapeCharsRegex = new RegExp(/[ \[\]]/);
export function escapeText(tokens: string[]) {
    return tokens
        .map((t) => (escapeCharsRegex.test(t) ? `"${t}"` : t))
        .join(" ");
}
