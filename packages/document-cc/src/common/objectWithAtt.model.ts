import * as yup from 'yup';
import {
  ConvectorModel,
  Default,
  ReadOnly,
  Required,
  Validate,
  FlatConvectorModel
} from '@worldsibu/convector-core-model';
import { Attribute } from '.';
import { BaseModel } from './baseModel.model';
export abstract class BaseObjWithAtt<T extends BaseObjWithAtt<any>> extends BaseModel<T> {
  @Validate(yup.array(Attribute.schema()))
  public attributes: Array<Attribute>;

  addAttribute(name: string, value: any, sender: string) {
    this.addAttributeObj(new Attribute(name, value, sender),sender)
  }

  addAttributeObj(attribute: Attribute, sender: string) {
    if (!this.attributes) {
      this.attributes = []
    }
    this.attributes = this.attributes.filter(att => att.name != attribute.name)
    this.attributes = this.attributes.concat(attribute)
    this.updateAuditField(sender)
  }

}

