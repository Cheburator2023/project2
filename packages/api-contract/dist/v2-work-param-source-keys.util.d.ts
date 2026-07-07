export declare function formatParamNameWithSourceKeys(name: string, sourceKeys?: readonly string[]): string;
export declare function parseParamNameSourceKeys(paramName: string | null | undefined): {
    displayName: string;
    sourceKeys: string[];
};
export declare function stripParamNameSourceKeys(paramName: string | null | undefined): string;
