import * as yup from 'yup';
import {
  ConvectorModel,
  Default,
  ReadOnly,
  Required,
  Validate,
  FlatConvectorModel
} from '@worldsibu/convector-core-model';
import { BaseObjWithAttAndIdenties } from '../common'
export class User extends BaseObjWithAttAndIdenties<User> {
  @ReadOnly()
  @Required()
  public readonly type = 'io.worldsibu.user';

  @Validate(yup.string())
  public fullname: string;

  @Required()
  @Validate(yup.string())
  public name: string;

  @Required()
  @Validate(yup.string())
  public email: string;

  @Validate(yup.string())
  public source: string;

  @Validate(yup.object())
  public userData: any;
}
