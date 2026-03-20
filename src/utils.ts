export function debounce(func: Function, wait: number) {
    let timeout: any;
    return function (...args: any[]) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}
