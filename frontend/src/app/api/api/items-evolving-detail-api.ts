import globalAxios, { AxiosInstance } from 'axios';
import { Configuration } from '../configuration';
import { BASE_PATH, BaseAPI, RequestArgs, RequiredError } from '../base';
import { ModelsItemsEvolvingDetail } from '../models/models-items-evolving-detail';

function createRequestArgs(path: string, method: string, configuration?: Configuration, options: any = {}): RequestArgs {
    const localVarUrlObj = new URL(path, 'https://example.com');
    const baseOptions = configuration ? configuration.baseOptions : undefined;
    const localVarRequestOptions = { method, ...baseOptions, ...options };
    const queryParameters = new URLSearchParams(localVarUrlObj.search);

    if (options.query) {
        for (const key in options.query) {
            const value = options.query[key];
            if (value !== undefined && value !== null) {
                queryParameters.set(key, value);
            }
        }
    }

    localVarUrlObj.search = queryParameters.toString();

    const headersFromBaseOptions = baseOptions && baseOptions.headers ? baseOptions.headers : {};
    localVarRequestOptions.headers = { ...headersFromBaseOptions, ...options.headers };

    return {
        url: localVarUrlObj.pathname + localVarUrlObj.search + localVarUrlObj.hash,
        options: localVarRequestOptions,
    };
}

export class ItemsEvolvingDetailApi extends BaseAPI {
    private request<T = any>(args: RequestArgs) {
        return this.axios.request<T>({
            ...args.options,
            url: this.basePath + args.url,
        });
    }

    public createItemsEvolvingDetail(requestParameters: { itemsEvolvingDetail: ModelsItemsEvolvingDetail }, options: any = {}) {
        if (requestParameters.itemsEvolvingDetail === null || requestParameters.itemsEvolvingDetail === undefined) {
            throw new RequiredError('itemsEvolvingDetail', 'Required parameter itemsEvolvingDetail was null or undefined when calling createItemsEvolvingDetail.');
        }

        const args = createRequestArgs('/items_evolving_detail', 'PUT', this.configuration, options);
        args.options.headers = { 'Content-Type': 'application/json', ...args.options.headers };
        args.options.data = JSON.stringify(requestParameters.itemsEvolvingDetail);
        return this.request<ModelsItemsEvolvingDetail>(args);
    }

    public deleteItemsEvolvingDetail(requestParameters: { id: number }, options: any = {}) {
        if (requestParameters.id === null || requestParameters.id === undefined) {
            throw new RequiredError('id', 'Required parameter id was null or undefined when calling deleteItemsEvolvingDetail.');
        }

        const args = createRequestArgs(`/items_evolving_detail/${encodeURIComponent(String(requestParameters.id))}`, 'DELETE', this.configuration, options);
        return this.request(args);
    }

    public getItemsEvolvingDetail(requestParameters: { id: number } & any, options: any = {}) {
        if (requestParameters.id === null || requestParameters.id === undefined) {
            throw new RequiredError('id', 'Required parameter id was null or undefined when calling getItemsEvolvingDetail.');
        }

        const args = createRequestArgs(`/items_evolving_detail/${encodeURIComponent(String(requestParameters.id))}`, 'GET', this.configuration, {
            ...options,
            query: {
                ...(options.query || {}),
                includes: requestParameters.includes,
                select: requestParameters.select,
            }
        });
        return this.request<ModelsItemsEvolvingDetail>(args);
    }

    public listItemsEvolvingDetails(requestParameters: any = {}, options: any = {}) {
        const args = createRequestArgs('/items_evolving_details', 'GET', this.configuration, {
            ...options,
            query: {
                ...(options.query || {}),
                includes: requestParameters.includes,
                where: requestParameters.where,
                whereOr: requestParameters.whereOr,
                groupBy: requestParameters.groupBy,
                limit: requestParameters.limit,
                page: requestParameters.page,
                orderBy: requestParameters.orderBy,
                orderDirection: requestParameters.orderDirection,
                select: requestParameters.select,
            }
        });
        return this.request<Array<ModelsItemsEvolvingDetail>>(args);
    }

    public updateItemsEvolvingDetail(requestParameters: { id: number, itemsEvolvingDetail: ModelsItemsEvolvingDetail }, options: any = {}) {
        if (requestParameters.id === null || requestParameters.id === undefined) {
            throw new RequiredError('id', 'Required parameter id was null or undefined when calling updateItemsEvolvingDetail.');
        }
        if (requestParameters.itemsEvolvingDetail === null || requestParameters.itemsEvolvingDetail === undefined) {
            throw new RequiredError('itemsEvolvingDetail', 'Required parameter itemsEvolvingDetail was null or undefined when calling updateItemsEvolvingDetail.');
        }

        const args = createRequestArgs(`/items_evolving_detail/${encodeURIComponent(String(requestParameters.id))}`, 'PATCH', this.configuration, options);
        args.options.headers = { 'Content-Type': 'application/json', ...args.options.headers };
        args.options.data = JSON.stringify(requestParameters.itemsEvolvingDetail);
        return this.request<ModelsItemsEvolvingDetail>(args);
    }
}

export const ItemsEvolvingDetailApiFactory = function (configuration?: Configuration, basePath?: string, axios?: AxiosInstance) {
    return new ItemsEvolvingDetailApi(configuration, basePath || BASE_PATH, axios || globalAxios);
}
