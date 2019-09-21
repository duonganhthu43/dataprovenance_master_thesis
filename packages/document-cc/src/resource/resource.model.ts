import * as yup from 'yup';
import {
  ConvectorModel,
  Default,
  ReadOnly,
  Required,
  Validate
} from '@worldsibu/convector-core-model';
import { BaseObjWithAtt } from '../common'

export class Resource extends BaseObjWithAtt<Resource> {
  @ReadOnly()
  @Required()
  public readonly type = 'io.worldsibu.resource';

  @Required()
  @Validate(yup.string())
  public file_hash: string;

  @Validate(yup.number())
  public size: number;

  @Validate(yup.string())
  public package_id: string;

  @Validate(yup.string())
  public state: string;
  
  @Validate(yup.string())
  public file_path: string;

  @Validate(yup.string())
  public description: string;

  @Validate(yup.string())
  public format: string;

  @Validate(yup.string())
  public mimetype_inner: string;

  @Validate(yup.string())
  public url_type: string;

  @Validate(yup.string())
  public cache_url: string;

  @Required()
  @Validate(yup.string())
  public name: string;

  @Validate(yup.string())
  public url: string;

  @Validate(yup.number())
  public position: number;

  @Validate(yup.string())
  public resource_type: string;

  @Validate(yup.string())
  public source: string;

  @Validate(yup.object())
  public resourceInfo: any;
}
