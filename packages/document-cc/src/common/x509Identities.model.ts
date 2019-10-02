import * as yup from 'yup';
import {
  ConvectorModel,
  Default,
  ReadOnly,
  Required,
  Validate
} from '@worldsibu/convector-core-model';

export class x509Identities  extends ConvectorModel<x509Identities>{
  constructor(status: boolean, fingerprint: string) {
    super()
    this.status = status;
    this.fingerprint = fingerprint;
  }
  @Validate(yup.boolean())
  @Required()
  status: boolean;
  @Validate(yup.string())
  @Required()
  fingerprint: string;
  @ReadOnly()
  @Required()
  public readonly type = 'io.worldsibu.x509Identities';
}
