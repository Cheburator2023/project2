
import { ApiRequestOptions } from "@react-client/common/api/core/ApiRequestOptions";
import { CancelablePromise } from "@react-client/common/api/core/CancelablePromise";
import axios from "axios";
import { OpenAPI, OpenAPIConfig } from "./OpenAPI";

export function request<T>(openAPI: OpenAPIConfig, config: ApiRequestOptions): CancelablePromise<T> {
    return new CancelablePromise<T>((resolve, reject, onCancel) => {
        axios.request({
            ...config,
            baseURL: openAPI.BASE,
            headers: {
                ...config.headers,
                ...openAPI.HEADERS,
            },
        }).then((response) => resolve(response.data)).catch(reject);
        onCancel(() => {
            axios.request({
                ...config,
                baseURL: openAPI.BASE,
                headers: {
                    ...config.headers,
                    ...openAPI.HEADERS,
                },
            }).then((response) => resolve(response.data)).catch(reject);
        });
    });
}