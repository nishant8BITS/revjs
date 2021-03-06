
import { expect } from 'chai';

import { AxiosRequestConfig, AxiosPromise, AxiosResponse } from 'axios';
import { getMockApiHttpClient, getMockHttpClient } from '../__test_utils__/mockHttpClient';
import { ModelApiBackend } from '../backend';
import { getModelManager, Comment, Post } from '../__fixtures__/models';
import { ModelManager, ModelOperationResult } from 'rev-models';
import { IReadMeta, IReadOptions } from 'rev-models/lib/models/types';

describe('ModelApiBackend - read()', () => {

    let manager: ModelManager;
    let mockHttpClient: (config: AxiosRequestConfig) => AxiosPromise;
    let apiBackend: ModelApiBackend;
    let readOptions: IReadOptions;
    let readResult: ModelOperationResult<any, IReadMeta>;

    async function setup(options: {
        responseType: 'rev-api' | 'mock',
        mockResponse?: AxiosResponse<any>
    }) {
        manager = getModelManager();
        if (options.responseType == 'rev-api') {
            mockHttpClient = await getMockApiHttpClient(manager);
        }
        else {
            mockHttpClient = getMockHttpClient(options.mockResponse);
        }
        apiBackend = new ModelApiBackend('/api', mockHttpClient);
        readOptions = {
            where: {},
            offset: 0,
            limit: 20
        };
        readResult = new ModelOperationResult<Comment, IReadMeta>({operationName: 'read'});
    }

    beforeEach(async () => {
        await setup({ responseType: 'rev-api' });
    });

    it('reads all scalar fields from graphql api (Comments)', async () => {
        const result = await apiBackend.read(
            manager, Comment, readOptions, readResult
        );
        expect(result.success).to.be.true;
        expect(result.results).to.deep.equal([
            { id: 1, comment: 'I totally agree' },
            { id: 2, comment: 'Sweet!' }
        ]);
        expect(result.results[0]).to.be.instanceof(Comment);
        expect(result.results[1]).to.be.instanceof(Comment);
    });

    it('reads all scalar fields from graphql api (Posts)', async () => {
        const result = await apiBackend.read(
            manager, Post, readOptions, readResult
        );
        expect(result.success).to.be.true;
        expect(result.results[0]).to.be.instanceof(Post);
        expect(result.results[1]).to.be.instanceof(Post);
        expect(result.results[2]).to.be.instanceof(Post);
        expect(result.results[0]).to.include({
            id: 1, title: 'RevJS v1.0.0 Released!'
        });
        expect(result.results[1]).to.include({
            id: 2, title: 'JavaScript is Awesome'
        });
        expect(result.results[2]).to.include({
            id: 3, title: 'Ruby Sucks'
        });
    });

    it('returns read metadata', async () => {
        const result = await apiBackend.read(
            manager, Post, {
                where: {},
                offset: 0,
                limit: 10
            }, readResult);
        expect(result.success).to.be.true;
        expect(result.meta).to.deep.equal({
            offset: 0,
            limit: 10,
            totalCount: 3
        });
    });

    it('where clause works as expected', async () => {
        const result = await apiBackend.read(
            manager, Post, {
                where: {
                    id: 3
                },
                offset: 0,
                limit: 10
            }, readResult
        );
        expect(result.success).to.be.true;
        expect(result.results).to.have.length(1);
        expect(result.results[0]).to.be.instanceof(Post);
        expect(result.results[0]).to.include({
            id: 3, title: 'Ruby Sucks'
        });
    });

    it('offset and limit options work as expected', async () => {
        const result = await apiBackend.read(
            manager, Post, {
                where: {},
                offset: 1,
                limit: 1
            }, readResult
        );
        expect(result.success).to.be.true;
        expect(result.results).to.have.length(1);
        expect(result.results[0]).to.be.instanceof(Post);
        expect(result.results[0]).to.include({
            id: 2, title: 'JavaScript is Awesome'
        });
    });

    it('throws error with received data if response is empty', () => {
        const mockResponse: AxiosResponse = {
            data: null,
            status: 200, statusText: '', headers: {}, config: {}
        };
        setup({ responseType: 'mock', mockResponse: mockResponse });

        return apiBackend.read(manager, Comment, readOptions, readResult)
            .then(() => { throw new Error('expected to reject'); })
            .catch((err) => {
                expect(err.message).to.contain('Received no data from the API');
                expect(err.response).to.equal(mockResponse);
            });
    });

    it('re-throws graphql errors if they have been returned', () => {
        const mockResponse: AxiosResponse = {
            data: {
                errors: [
                    { message: 'Something broke!' }
                ]
            },
            status: 200, statusText: '', headers: {}, config: {}
        };
        setup({ responseType: 'mock', mockResponse: mockResponse });

        return apiBackend.read(manager, Comment, readOptions, readResult)
            .then(() => { throw new Error('expected to reject'); })
            .catch((err) => {
                expect(err.message).to.contain('GraphQL errors were returned');
                expect(err.response).to.equal(mockResponse);
            });
    });

    it('throws error with received data if response does not contain graphql "data" key', () => {
        const mockResponse: AxiosResponse = {
            data: {},
            status: 200, statusText: '', headers: {}, config: {}
        };
        setup({ responseType: 'mock', mockResponse: mockResponse });

        return apiBackend.read(manager, Comment, readOptions, readResult)
            .then(() => { throw new Error('expected to reject'); })
            .catch((err) => {
                expect(err.message).to.contain('GraphQL response did not contain the expected model results');
                expect(err.response).to.equal(mockResponse);
            });
    });

    it('throws error with received data if response does not contain the expected model results', () => {
        const mockResponse: AxiosResponse = {
            data: {
                data: {
                    Users: {
                        results: []
                    }
                }
            },
            status: 200, statusText: '', headers: {}, config: {}
        };
        setup({ responseType: 'mock', mockResponse: mockResponse });

        return apiBackend.read(manager, Comment, readOptions, readResult)
            .then(() => { throw new Error('expected to reject'); })
            .catch((err) => {
                expect(err.message).to.contain('GraphQL response did not contain the expected model results');
                expect(err.response).to.equal(mockResponse);
            });
    });
});
