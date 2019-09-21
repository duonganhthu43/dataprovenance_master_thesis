import { ChaincodeTx } from '@worldsibu/convector-platform-fabric';
import {
  Controller,
  ConvectorController,
  Invokable,
  Param
} from '@worldsibu/convector-core';

import { DataProvenance } from './dataProvenance.model';

@Controller('dataprovenance')
export class DataProvenanceController extends ConvectorController<ChaincodeTx> {
  @Invokable()
  public async create(
    @Param(DataProvenance)
    dataProvenance: DataProvenance
  ) {
    await dataProvenance.save();
  }
}