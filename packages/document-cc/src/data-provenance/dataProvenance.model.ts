import * as yup from 'yup';
import {
  ConvectorModel,
  Default,
  ReadOnly,
  Required,
  Validate
} from '@worldsibu/convector-core-model';
import { BaseModel } from '../common/baseModel.model';
var hash = require('object-hash');

export abstract class BaseComponent<T extends BaseComponent<any>> extends ConvectorModel<T> {
  @Required()
  @Validate(yup.string())
  public name: string

  @ReadOnly()
  @Required()
  abstract type: string;

  @Validate(yup.string())
  public id: string

  @Validate(yup.string())
  public associated_type: string

  private _info: any;

  get hashInfo(): string {
    let hashObject = Object.assign({}, this._info)
    return this.info && hash(hashObject, { algorithm: 'md5', encoding: 'base64', respectType: 'false' })
  }
  get info(): any {
    return this._info;
  }
  set info(value: any) {
    this._info = value;
  }
}

export class Entity extends BaseComponent<Entity> {

  @ReadOnly()
  @Required()
  public readonly type = 'entity';
}

export class Agent extends BaseComponent<Agent> {
  @ReadOnly()
  @Required()
  public readonly type = 'agent';
}

export class Activity extends BaseComponent<Activity> {
  @ReadOnly()
  @Required()
  public readonly type = 'activity';
}

export abstract class ProvenanceInfo extends BaseModel<ProvenanceInfo> {

  @Validate(yup.object())
  public description: any

  @Required()
  @Validate(yup.string())
  abstract shortName: string

}

export class WasAssociatedWith extends ProvenanceInfo {
  @Required()
  @ReadOnly()
  public shortName = 'wAW';
  @ReadOnly()
  @Required()
  public readonly type = 'wasAssociatedWith';
  @Required()
  @Validate(yup.string())
  public activity: string
  @Required()
  @Validate(yup.string())
  public agent: string
  @Required()
  @Validate(yup.string())
  public role: string
}

export class WasDerivedFrom extends ProvenanceInfo {
  @Required()
  @ReadOnly()
  public shortName = 'wDF';
  @ReadOnly()
  @Required()
  public readonly type = 'wasDerivedFrom';
  @Required()
  @Validate(yup.string())
  public usedEntity: string

  @Required()
  @Validate(yup.string())
  public generatedEntity: string
}

export class WasGeneratedBy extends ProvenanceInfo {
  @Required()
  @ReadOnly()
  public shortName = 'wGB';
  @ReadOnly()
  @Required()
  public readonly type = 'wasGeneratedBy';
  @Required()
  @Validate(yup.string())
  public entity: string

  @Required()
  @Validate(yup.string())
  public activity: string
}

export class Used extends ProvenanceInfo {
  @Required()
  @ReadOnly()
  public shortName = 'u';
  @ReadOnly()
  @Required()
  public readonly type = 'used';
  @Required()
  @Validate(yup.string())
  public activity: string

  @Required()
  @Validate((yup.string()))
  public entity: string
}

export class WasInformedBy extends ProvenanceInfo {
  @Required()
  @ReadOnly()
  public shortName = 'Infm';
  @ReadOnly()
  @Required()
  public readonly type = 'wasInformedBy';
  @Required()
  @Validate(yup.string())
  public informant: string

  @Required()
  @Validate(yup.string())
  public informed: string
}

export class WasAttributedTo extends ProvenanceInfo {
  @Required()
  @ReadOnly()
  public shortName = 'wAT';
  @ReadOnly()
  @Required()
  public readonly type = 'wasAttributedTo';
  @Required()
  @Validate(yup.string())
  public entity: string

  @Required()
  @Validate(yup.string())
  public agent: string
}

export class HadMember extends ProvenanceInfo {
  @Required()
  @ReadOnly()
  public shortName = 'hM';
  @ReadOnly()
  @Required()
  public readonly type = 'hadMember';
  @Required()
  @Validate(yup.string())
  public collection: string

  @Required()
  @Validate(yup.string())
  public entity: string
}

export class ActedOnBehalfOf extends ProvenanceInfo {
  @Required()
  @ReadOnly()
  public shortName = 'aOBO';
  @ReadOnly()
  @Required()
  public readonly type = 'actedOnBehalfOf';
  @Required()
  @Validate(yup.string())
  public delegate: string

  @Required()
  @Validate(yup.string())
  public responsible: string
}

export class Chapter extends BaseModel<Chapter> {
  @ReadOnly()
  @Required()
  public readonly type = 'chapter';

  @Validate(yup.array(Agent.schema()))
  public agents: Array<Agent>;

  @Validate(yup.array(Entity.schema()))
  public entities: Array<Entity>;

  @Validate(yup.array(Activity.schema()))
  public activities: Array<Activity>;

  @Validate(yup.array(ProvenanceInfo.schema()))
  public provenanceInfo: Array<ProvenanceInfo>;
}

export class DataProvenance extends BaseModel<DataProvenance> {
  @ReadOnly()
  @Required()
  public readonly type = 'wrapper';

  @Required()
  @Validate(yup.string())
  public associated_with_obj_id: string

  @Required()
  @Validate(yup.string())
  public object_type: string

  @Validate(yup.array(Chapter.schema()))
  public story: Array<Chapter>
}


