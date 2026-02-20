export const runtimeHeaders = {
    clientVersion: null,
    contentVersion: null,
    contentSecretKey: null,
    userAgent: null
};

export function setRuntimeHeader(key, value) {
    if (!(key in runtimeHeaders)) {
        throw new Error(`Invalid runtime header key: ${key}`);
    }

    runtimeHeaders[key] = value;
}