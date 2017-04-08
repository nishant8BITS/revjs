
import { expect } from 'chai';
import { IModelOperation } from '../operation';
import { ModelOperationResult } from '../operationresult';

describe('ModelOperationResult - constructor()', () => {

    it('sets up an empty result as expected', () => {
        let op: IModelOperation = {operation: 'create'};
        let res = new ModelOperationResult(op);
        expect(res.success).to.equal(true);
        expect(res.operation).to.equal(op);
        expect(res.errors).to.deep.equal([]);
        expect(res.validation).to.be.null;
        expect(res.result).to.be.null;
        expect(res.results).to.be.null;
    });

});

describe('ModelOperationResult - addError()', () => {

    let res: ModelOperationResult<any>;

    beforeEach(() => {
        res = new ModelOperationResult({operation: 'create'});
    });

    it('adds an error with specified message', () => {
        res.addError('The database has exploded!');
        expect(res.errors).to.deep.equal([
            {
                message: 'The database has exploded!'
            }
        ]);
    });

    it('adds an error with message and code', () => {
        res.addError('The database has exploded!', 'db_error');
        expect(res.errors).to.deep.equal([
            {
                message: 'The database has exploded!',
                code: 'db_error'
            }
        ]);
    });

    it('adds an error with message, code and data', () => {
        res.addError('The database has exploded!', 'db_error', {dbms: 'SQL Server'});
        expect(res.errors).to.deep.equal([
            {
                message: 'The database has exploded!',
                code: 'db_error',
                dbms: 'SQL Server'
            }
        ]);
    });

    it('adds a second error with specified message', () => {
        res.addError('Silly operation!');
        res.addError('This function has performed an illegal operation.');
        expect(res.errors).to.deep.equal([
            {
                message: 'Silly operation!'
            },
            {
                message: 'This function has performed an illegal operation.'
            }
        ]);
    });

    it('adds a second modelError with message and data', () => {
        res.addError('Silly operation!');
        res.addError('E-roar', 'oh_no!', {data: 42});
        expect(res.errors).to.deep.equal([
            {
                message: 'Silly operation!'
            },
            {
                message: 'E-roar',
                code: 'oh_no!',
                data: 42
            }
        ]);
    });

    it('sets valid to false when error is added', () => {
        expect(res.success).to.equal(true);
        res.addError('fail!');
        expect(res.success).to.equal(false);
    });

    it('throws an error when no message is specified', () => {
        expect(() => {
            res.addError(undefined);
        }).to.throw('A message must be specified for the operation error');
    });

    it('throws an error if data is not an object', () => {
        expect(() => {
            res.addError('Operation took too long', 'timeout', 1000000);
        }).to.throw('You cannot add non-object data to an operation result');
    });

});
