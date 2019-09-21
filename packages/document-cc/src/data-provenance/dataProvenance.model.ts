import * as yup from 'yup';
import {
  ConvectorModel,
  Default,
  ReadOnly,
  Required,
  Validate
} from '@worldsibu/convector-core-model';
import { BaseModel } from '../common/baseModel.model';
export abstract class BaseComponent<T extends BaseComponent<any>> extends  ConvectorModel<T> {
  @Required()
  @Validate(yup.string())
  public name: string

  @ReadOnly()
  @Required()
  public type = 'io.worldsibu.dataProvenance.component';

  public info: any

  @Validate(yup.string())
  public id: string

  @Validate(yup.string())
  public associated_type: string
}

export class Entity extends BaseComponent<Entity> {
  @ReadOnly()
  @Required()
  public readonly type = 'io.worldsibu.dataProvenance.component.entity';
}

export class Agent extends BaseComponent<Agent> {
  @ReadOnly()
  @Required()
  public readonly type = 'io.worldsibu.dataProvenance.component.agent';
}

export class Activity extends BaseComponent<Agent> {
  @ReadOnly()
  @Required()
  public readonly type = 'io.worldsibu.dataProvenance.component.activity';
}

export abstract class ProvenanceInfo extends BaseModel<ProvenanceInfo> {
  
  @Validate(yup.string())
  public description: string
}

export class WasAssociatedWith extends ProvenanceInfo {
  @ReadOnly()
  @Required()
  public readonly type = 'io.worldsibu.dataProvenance.provenanceinfo.wasassociatedwith';
  @Required()
  @Validate(Activity.schema())
  public activity: Activity
  @Required()
  @Validate(Agent.schema())
  public agent: Agent
}

export class WasDerivedFrom extends ProvenanceInfo {
  @ReadOnly()
  @Required()
  public readonly type = 'io.worldsibu.dataProvenance.provenanceinfo.wasderivedfrom';
  @Required()
  @Validate(Entity.schema())
  public source: Entity

  @Required()
  @Validate(Entity.schema())
  public destination: Entity
}

export class WasGeneratedBy extends ProvenanceInfo {
  @ReadOnly()
  @Required()
  public readonly type = 'io.worldsibu.dataProvenance.provenanceinfo.wasgeneratedby';
  @Required()
  @Validate(Entity.schema())
  public entity: Entity
  
  @Required()
  @Validate(Activity.schema())
  public activity: Activity
}

export class Used extends ProvenanceInfo {
  @ReadOnly()
  @Required()
  public readonly type = 'io.worldsibu.dataProvenance.provenanceinfo.used';
  @Required()
  @Validate(Activity.schema())
  public activity: Activity
  
  @Required()
  @Validate(Entity.schema())
  public entity: Entity
}

export class WasInformedBy extends ProvenanceInfo {
  @ReadOnly()
  @Required()
  public readonly type = 'io.worldsibu.dataProvenance.provenanceinfo.wasinformedby';
  @Required()
  @Validate(Activity.schema())
  public activity1: Activity
  
  @Required()
  @Validate(Activity.schema())
  public activity2: Activity
}

export class WasAttributedTo extends ProvenanceInfo {
  @ReadOnly()
  @Required()
  public readonly type = 'io.worldsibu.dataProvenance.provenanceinfo.wasattributedto';
  @Required()
  @Validate(Entity.schema())
  public entity: Entity
  
  @Required()
  @Validate(Agent.schema())
  public agent: Agent
}

export class ActedOnBehalfOf extends ProvenanceInfo{
  @ReadOnly()
  @Required()
  public readonly type = 'io.worldsibu.dataProvenance.provenanceinfo.actedonbehalfof';
  @Required()
  @Validate(Agent.schema())
  public agent1: Agent
  
  @Required()
  @Validate(Agent.schema())
  public agent2: Agent
}

export class Chapter extends BaseModel<Chapter> {
  @ReadOnly()
  @Required()
  public readonly type = 'io.worldsibu.dataProvenance.chapter';

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
  public readonly type = 'io.worldsibu.dataProvenance.wrapper';
  
  @Required()
  @Validate(yup.string())
  public associated_with_obj_id:string 

  @Required()
  @Validate(yup.string())
  public object_type:string 

  @Validate(yup.array(Chapter.schema()))
  public story: Array<Chapter>
}
