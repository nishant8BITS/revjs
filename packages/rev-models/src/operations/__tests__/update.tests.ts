
import { expect } from 'chai';
import * as rewire from 'rewire';

import { Model } from '../../models/model';
import * as d from '../../decorators';
import * as update from '../update';
import { MockBackend } from './mock-backend';
import { ModelValidationResult } from '../../validation/validationresult';
import { DEFAULT_UPDATE_OPTIONS, IUpdateOptions } from '../update';
import { ModelRegistry } from '../../registry/registry';

let GENDERS = [
    ['male', 'Male'],
    ['female', 'Female']
];

class TestModel extends Model {
    @d.TextField({ primaryKey: true })
        name: string;
    @d.SelectionField({ selection: GENDERS })
        gender: string;
    @d.IntegerField({ required: false, minValue: 10 })
        age: number;
    @d.EmailField({ required: false })
        email: string;
}

class UnregisteredModel extends Model {}

class ModelWithNoPK extends Model {
    @d.TextField()
        name: string;
    @d.IntegerField()
        age: number;
}

let rewired = rewire('../update');
let rwUpdate: typeof update & typeof rewired = rewired as any;
let mockBackend: MockBackend;
let registry: ModelRegistry;

describe('rev.operations.update()', () => {

    let options: IUpdateOptions;

    beforeEach(() => {
        options = {
            where: {}
        };
        mockBackend = new MockBackend();
        registry = new ModelRegistry();
        registry.registerBackend('default', mockBackend);
        registry.register(TestModel);
        registry.register(ModelWithNoPK);
    });

    it('calls backend.update() and returns successful result if model is valid', () => {
        let model = new TestModel();
        model.name = 'Bob';
        model.gender = 'male';
        return rwUpdate.update(registry, model, options)
            .then((res) => {
                expect(mockBackend.updateStub.callCount).to.equal(1);
                let updateCall = mockBackend.updateStub.getCall(0);
                expect(updateCall.args[1]).to.equal(model);
                expect(res.success).to.be.true;
                expect(res.validation).to.be.instanceOf(ModelValidationResult);
                expect(res.validation.valid).to.be.true;
            });
    });

    it('calls backend.update() with DEFAULT_UPDATE_OPTIONS if no options are set', () => {
        let model = new TestModel();
        model.name = 'Bob';
        model.gender = 'male';
        let testOpts = Object.assign({}, DEFAULT_UPDATE_OPTIONS, options);
        return rwUpdate.update(registry, model, options)
            .then((res) => {
                expect(mockBackend.updateStub.callCount).to.equal(1);
                let updateCall = mockBackend.updateStub.getCall(0);
                expect(updateCall.args[1]).to.equal(model);
                expect(updateCall.args[2]).to.equal(options.where);
                expect(updateCall.args[4]).to.deep.equal(testOpts);
            });
    });

    it('calls backend.update() with overridden options if they are set', () => {
        let model = new TestModel();
        model.name = 'Bob';
        model.gender = 'male';
        options.validation = {};
        return rwUpdate.update(registry, model, options)
            .then((res) => {
                expect(mockBackend.updateStub.callCount).to.equal(1);
                let updateCall = mockBackend.updateStub.getCall(0);
                expect(updateCall.args[1]).to.equal(model);
                expect(updateCall.args[2]).to.equal(options.where);
                expect(updateCall.args[4].validation).to.deep.equal({});
            });
    });

    it('calls backend.update() with primary key where clause when opts.where is not set', () => {
        let model = new TestModel();
        model.name = 'Bob';
        model.gender = 'male';
        return rwUpdate.update(registry, model)
            .then((res) => {
                expect(mockBackend.updateStub.callCount).to.equal(1);
                let updateCall = mockBackend.updateStub.getCall(0);
                expect(updateCall.args[1]).to.equal(model);
                expect(updateCall.args[2]).to.deep.equal({
                    name: 'Bob'
                });
            });
    });

    it('rejects if model is not registered', () => {
        let model = new UnregisteredModel();
        return expect(rwUpdate.update(registry, model))
            .to.be.rejectedWith('is not registered');
    });

    it('rejects when where clause is not specified and model has no primary key', () => {
        let model = new ModelWithNoPK();
        return expect(rwUpdate.update(registry, model))
            .to.be.rejectedWith('update() must be called with a where clause for models with no primaryKey');
    });

    it('rejects when where clause is not specified and model primaryKey is undefined', () => {
        let model = new TestModel();
        return expect(rwUpdate.update(registry, model))
            .to.be.rejectedWith('primary key field \'name\' is undefined');
    });

    it('rejects when options.fields set to something other than an array', () => {
        let model = new TestModel({ name: 'Bob', gender: 'male' });
        options = {
            fields: 'name, gender' as any
        };
        return expect(rwUpdate.update(registry, model, options))
            .to.be.rejectedWith('options.fields must be an array of field names');
    });

    it('rejects when options.fields contains an invalid fiel name', () => {
        let model = new TestModel({ name: 'Bob', gender: 'male' });
        options = {
            fields: ['cc_number']
        };
        return expect(rwUpdate.update(registry, model, options))
            .to.be.rejectedWith('Field \'cc_number\' does not exist in TestModel');
    });

    it('rejects with unsuccessful result when model fields do not pass validation', () => {
        let model = new TestModel();
        model.name = 'Bill';
        model.gender = 'fish';
        model.age = 9;
        model.email = 'www.google.com';
        return rwUpdate.update(registry, model, options)
            .then((res) => { throw new Error('expected reject'); })
            .catch((res) => {
                expect(res).to.be.instanceof(Error);
                expect(res.message).to.equal('ValidationError');
                expect(res.result).to.exist;
                expect(res.result.success).to.be.false;
                expect(res.result.validation).to.be.instanceOf(ModelValidationResult);
                expect(res.result.validation.valid).to.be.false;
            });
    });

    it('rejects with any operation errors added by the backend', () => {
        let model = new TestModel();
        model.name = 'Bob';
        model.gender = 'male';
        mockBackend.errorsToAdd = ['some_backend_error'];
        return rwUpdate.update(registry, model, options)
            .then((res) => { throw new Error('expected reject'); })
            .catch((res) => {
                expect(res).to.be.instanceof(Error);
                expect(res.result).to.exist;
                expect(res.result.success).to.be.false;
                expect(res.result.errors.length).to.equal(1);
                expect(res.result.errors[0].message).to.equal('some_backend_error');
            });
    });

    it('rejects with any operation errors added by the backend', () => {
        let model = new TestModel();
        model.name = 'Bob';
        model.gender = 'male';
        mockBackend.errorsToAdd = ['some_backend_error'];
        return rwUpdate.update(registry, model, options)
            .then((res) => { throw new Error('expected reject'); })
            .catch((res) => {
                expect(res).to.be.instanceof(Error);
                expect(res.result).to.exist;
                expect(res.result.success).to.be.false;
                expect(res.result.errors.length).to.equal(1);
                expect(res.result.errors[0].message).to.equal('some_backend_error');
            });
    });

    it('rejects with expected error when backend.update rejects', () => {
        let expectedError = new Error('epic fail!');
        let model = new TestModel();
        model.name = 'Bob';
        model.gender = 'male';
        mockBackend.errorToThrow = expectedError;
        return expect(rwUpdate.update(registry, model, options))
            .to.be.rejectedWith(expectedError);
    });

});
