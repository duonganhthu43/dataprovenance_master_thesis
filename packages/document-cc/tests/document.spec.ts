// tslint:disable:no-unused-expression
import { join } from 'path';
import { expect } from 'chai';
import * as uuid from 'uuid/v4';
import { MockControllerAdapter } from '@worldsibu/convector-adapter-mock';
import { ClientFactory, ConvectorControllerClient } from '@worldsibu/convector-core';
import 'mocha';

import { Document, DocumentController } from '../src';

describe('Document', () => {
  let adapter: MockControllerAdapter;
  let documentCtrl: ConvectorControllerClient<DocumentController>;
  
  before(async () => {
    // Mocks the blockchain execution environment
    adapter = new MockControllerAdapter();
    documentCtrl = ClientFactory(DocumentController, adapter);

    await adapter.init([
      {
        version: '*',
        controller: 'DocumentController',
        name: join(__dirname, '..')
      }
    ]);

    adapter.addUser('Test');
  });
  
  it('should create a default model', async () => {
    const modelSample = new Document({
      id: uuid(),
      name: 'Test',
      created: Date.now(),
      modified: Date.now()
    });

    await documentCtrl.$withUser('Test').create(modelSample);
  
    const justSavedModel = await adapter.getById<Document>(modelSample.id);
  
    expect(justSavedModel.id).to.exist;
  });
});