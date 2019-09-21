import * as yup from 'yup';
import {
  ConvectorModel,
  Default,
  ReadOnly,
  Required,
  Validate
} from '@worldsibu/convector-core-model';

export class Attribute extends ConvectorModel<Attribute> {
  constructor(name: string, value: string, sender: string) {
    super()
    this.issuedDate = Date.now()
    this.expiresDate = null;
    this.name = name;
    this.value = value;
    this.certifierID = sender;
    this.expired = false
  }
  @ReadOnly()
  @Required()
  public readonly type = 'io.worldsibu.attribute';
  
  @Required()
  @ReadOnly()
  @Validate(yup.number())
  public issuedDate: number;

  public expiresDate: Date;
  
  @Default(false)
  @Validate(yup.boolean())
  public expired: boolean;

  @Required()
  @Validate(yup.string())
  public certifierID: string;

  @Required()
  @Validate(yup.string())
  public name: string;

  @Required()
  @Validate(yup.string())
  public value: string;
}
