import * as yup from 'yup';
import {
  ConvectorModel,
  Default,
  ReadOnly,
  Required,
  Validate
} from '@worldsibu/convector-core-model';
import { BaseObjWithAtt } from '../common'

export class Organization extends BaseObjWithAtt<Organization> {
  @ReadOnly()
  @Required()
  public readonly type = 'io.worldsibu.organization';

  @Validate(yup.string())
  public description: string;

  @Validate(yup.string())
  @Required()
  public title: string;

  @Validate(yup.string())
  @Required()
  public name: string;

  @Validate(yup.bool())
  public is_organization: boolean;

  @Validate(yup.string())
  public state: string;
  
  @Validate(yup.string())
  public image_url: string;
  @Validate(yup.string())
  public approval_status: string;
  
  @Validate(yup.string())
  public source: string;
  
  @Validate(yup.string())
  public organization_type: string;

  @Required()
  @Validate(yup.object())
  public organizationInfo: any;
}
