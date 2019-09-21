import * as yup from 'yup';
import {
  ConvectorModel,
  Default,
  ReadOnly,
  Required,
  Validate
} from '@worldsibu/convector-core-model';
import { BaseObjWithAtt } from '../common'

export class Dataset extends BaseObjWithAtt<Dataset> {
  @ReadOnly()
  @Required()
  public readonly type = 'io.worldsibu.dataset';

  @Validate(yup.string())
  public maintainer: string;

  @Required()
  @Validate(yup.string())
  public name: string;

  @Required()
  @Validate(yup.string())
  public title: string;

  @Validate(yup.string())
  public author_email: string;

  @Validate(yup.string())
  public notes: string;

  @Validate(yup.string())
  public maintainer_email: string;
  
  @Validate(yup.string())
  public url: string;

  @Validate(yup.string())
  public state: string;

  @Validate(yup.string())
  public version: string;

  @Validate(yup.string())
  public license_id: string;

  @Validate(yup.string())
  public creator_user_id: string;

  @Validate(yup.array(yup.object()))
  public tags: object[];
  
  @Validate(yup.string())
  public tag_string: string;

  @Validate(yup.string())
  public source: string;

  @Validate(yup.object())
  public datasetInfo: any;
}