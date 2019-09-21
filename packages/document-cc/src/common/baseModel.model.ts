import * as yup from 'yup';
import {
  ConvectorModel,
  Default,
  ReadOnly,
  Required,
  Validate,
  FlatConvectorModel
} from '@worldsibu/convector-core-model';
export abstract class BaseModel<T extends BaseModel<any>> extends ConvectorModel<T> {
  @Validate(yup.string())
  public modifiedBy: string

  @Validate(yup.string())
  public createdBy: string

  @ReadOnly()
  @Validate(yup.number())
  public created: number;

  @Validate(yup.number())
  public modified: number;

  public createAuditField(sender: string) {
    this.modified = Date.now()
    this.created = Date.now()
    this.modifiedBy = sender
    this.createdBy = sender
  }

  public updateAuditField(sender: string) {
    this.modified = Date.now()
    this.modifiedBy = sender
  }
}

