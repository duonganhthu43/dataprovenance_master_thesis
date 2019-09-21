import * as yup from 'yup';
import {
  ConvectorModel,
  Default,
  ReadOnly,
  Required,
  Validate,
  FlatConvectorModel
} from '@worldsibu/convector-core-model';

import {Attribute, x509Identities, BaseObjWithAttAndIdenties} from '../common'

export class Portal  extends BaseObjWithAttAndIdenties<Portal>  {
  @ReadOnly()
  @Required()
  public readonly type = 'io.worldsibu.portal';

  @Required()
  @Validate(yup.string())
  public id: string;

  @Required()
  @Validate(yup.string())
  public name: string;
  
  @Validate(yup.string())
  public MSP: string
}
