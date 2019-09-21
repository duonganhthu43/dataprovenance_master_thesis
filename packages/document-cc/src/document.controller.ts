import { ChaincodeTx } from '@worldsibu/convector-platform-fabric';
import {
  Controller,
  ConvectorController,
  Invokable,
  Param,
} from '@worldsibu/convector-core';
import { Document } from './document.model';

@Controller('document')
export class DocumentController extends ConvectorController<ChaincodeTx> {
  @Invokable()
  public async create(
    @Param(Document)
    document: Document
  ) {
    await document.save();
  }
}