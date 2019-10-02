import { ChaincodeTx } from '@worldsibu/convector-platform-fabric';
import {
  Controller,
  ConvectorController,
  Invokable,
  Param
} from '@worldsibu/convector-core';
import { Resource } from './resource.model';
import * as yup from 'yup';
import { BaseController } from '../common';
import { User } from '../user/user.model';
import { DataProvenance, Agent, Entity, Activity, WasGeneratedBy, WasAttributedTo, WasAssociatedWith, ActedOnBehalfOf, Chapter } from '../data-provenance';
import { Utilities } from '../common/utilities';

@Controller('resource')
export class ResourceController extends BaseController<Resource> {
  onCreateProv(currentSender: User, dataset: Resource, dataInfo: any) {
    
  }
  
  async onCreate(modelInfo: any, sender: User): Promise<Resource> {
    let lstResource = await Resource.query(Resource, {
      "selector": {
        type: new Resource().type,
        "id": modelInfo['id'],
        'source': modelInfo['source']
      }
    }) as Resource[]
    if (lstResource.length > 0) {
      throw new Error('There already existed resource with id' + modelInfo['id'] + 'from ' + modelInfo['source'])
    }
    let newResource = new Resource()
    newResource.createAuditField(this.sender)
    newResource = this.mappingValue(modelInfo, newResource)
    newResource.id = modelInfo.id ? modelInfo.id : this.tx.stub.generateUUID(JSON.stringify(modelInfo))
    await newResource.save();
    return newResource

  }

  @Invokable()
  public async create(
    @Param(yup.object())
    resourceInfo: any
  ) {
    return await super.create(resourceInfo)
  }
  @Invokable()
  public async update(
    @Param(yup.object())
    resourceInfo: any
  ) {
    let currentSender = await this.validateCurrentSender()
    let lstResource = await Resource.query(Resource, {
      "selector": {
        type: new Resource().type,
        "id": resourceInfo['id'],
        'source': resourceInfo['source']
      }
    }) as Resource[]
    if (lstResource.length !== 1) {
      throw new Error('Theres no resource related to id' + resourceInfo['id'] + 'from ' + resourceInfo['source'])
    }
    let resource = lstResource[0]
    let oldValue = { ...resource.toJSON() }
    resource = this.mappingValue(resourceInfo, resource)
    let newValue = { ...resource.toJSON() }
    let diff = Utilities.findDiff(oldValue, newValue, {})
    if (!diff || diff.length < 1) { return <Resource>resource.toJSON() }
    // await this.updateProvenanceInfo(resource, currentSender, newValue, diff)
    await resource.save();
    return <Resource>resource.toJSON()
  }

  @Invokable()
  public async getbypackageid(
    @Param(yup.object())
    resourceInfo: any
  ) {
    let currentSender = await this.validateCurrentSender()
    let isPortalUser = this.checkingIfPortalUser(currentSender)
    var querryCriteria: any = {}
    if (isPortalUser) {
      querryCriteria = {
        "selector": {
          type: new Resource().type,
          "package_id": resourceInfo['package_id'],
          source: currentSender['source']
        }
      }
    } else {
      querryCriteria = {
        "selector": {
          type: new Resource().type,
          "package_id": resourceInfo['package_id'],
          source: currentSender['source']
        }
      }
    }
    let lstResource = await Resource.query(Resource, querryCriteria) as Resource[]
    return <Resource[]>lstResource.map(value => value.toJSON())
  }
  private mappingValue(source: any, destination: Resource) {
    let newDestination = destination.clone()
    newDestination.file_hash = source['file_hash']
    newDestination.name = source['name']

    let keysArr = ['size', 'package_id', 'state', 'file_path', 'description', 'format', 'mimetype_inner', 'url_type', 'cache_url', 'url', 'position', 'resource_type', 'source']
    keysArr.forEach(key => {
      if (source[key]) {
        newDestination[key] = source[key]
      }
    })

    return newDestination
  }

// public createActivityWithName(name: string) {
  //   let activitity = new Activity()
  //   activitity.name = name
  //   return activitity
  // }

  // public createAgentFromCurrentSender(currentSender: User) {
  //   let currentSender_Agent = new Agent()
  //   currentSender_Agent.id = currentSender.id
  //   currentSender_Agent.associated_type = currentSender.type
  //   currentSender_Agent.name = currentSender.name
  //   currentSender_Agent.info = currentSender
  //   return currentSender_Agent
  // }
  // public createRelatedEntity(resource: Resource, resourceInfo: any) {
  //   let entity = new Entity()
  //   entity.associated_type = resource.type
  //   entity.info = resourceInfo
  //   entity.name = resource.name
  //   return entity
  // }

  // public async createAgentFromUserAssociated(userInfoAssociatied: any) {
  //   if (!userInfoAssociatied || Object.keys(userInfoAssociatied).length < 1) { return undefined }
  //   let associatedAgent = new Agent()
  //   associatedAgent.info = userInfoAssociatied

  //   let userByID = await Utilities.findUserById(userInfoAssociatied['id'])
  //   if (userByID) {
  //     associatedAgent.id = userByID.id
  //     associatedAgent.associated_type = userByID.type
  //   } else {
  //     associatedAgent.id = userInfoAssociatied['id']
  //     //associatedAgent.associated_type = `user_not_recored_in_system`
  //   }
  //   return associatedAgent
  // }
  // public async onCreateAgentsAndEntity(currentSender: User, userInfoAssociatied: any, currentResource: Resource, resourceInfo: any) {
  //   let chapter = new Chapter
  //   // create agent from current sender
  //   let currentSender_Agent = this.createAgentFromCurrentSender(currentSender)
  //   chapter.agents = [currentSender_Agent]
  //   // checking if have associatied agent
  //   let associatedAgent: Agent = await this.createAgentFromUserAssociated(userInfoAssociatied);
  //   if (associatedAgent) {
  //     chapter.agents = chapter.agents.concat(associatedAgent)
  //   }
  //   // create current related entity
  //   let entity = this.createRelatedEntity(currentResource, resourceInfo)
  //   chapter.entities = [entity]
  //   return chapter
  // }
  // public async onCreateChapterComponent(currentSender: User, userInfoAssociatied: any, currentResource: Resource, resourceInfo: any) {
  //   let chapter = await this.onCreateAgentsAndEntity(currentSender, userInfoAssociatied, currentResource, resourceInfo)
  //   let activitity = this.createActivityWithName('create_new_resouce')
  //   chapter.activities = [activitity]
  //   return chapter
  // }
  // public async createProvenanceInfo(newResource: Resource, currentSender: User, dataSourceInfo: any) {
  //   // create provenance for resource
  //   let datasourceProvenance = new DataProvenance()
  //   datasourceProvenance.associated_with_obj_id = newResource.id
  //   datasourceProvenance.object_type = newResource.type
  //   let userInfoAssociatied = { ...dataSourceInfo['user'] }
  //   // manually remove user info
  //   delete dataSourceInfo["user"]
  //   let newChapter = await this.onCreateChapterComponent(currentSender, userInfoAssociatied, newResource, dataSourceInfo)

  //   // create provenance info
  //   let wasGeneratedBy_info = new WasGeneratedBy()
  //   wasGeneratedBy_info.entity = newChapter.entities[0]
  //   wasGeneratedBy_info.activity = newChapter.activities[0]
  //   newChapter.provenanceInfo = [wasGeneratedBy_info]

  //   let isHaveUserAssociated: boolean = newChapter.agents.length > 1
  //   let wasAttributedTo_info = new WasAttributedTo()
  //   wasAttributedTo_info.entity = newChapter.entities[0]
  //   wasAttributedTo_info.agent = isHaveUserAssociated ? newChapter.agents[1] : newChapter.agents[0]
  //   newChapter.provenanceInfo = newChapter.provenanceInfo.concat(wasAttributedTo_info)

  //   if (isHaveUserAssociated) {
  //     let wasAssociatedWith_info = new WasAssociatedWith()
  //     wasAssociatedWith_info.agent = newChapter.agents[0]
  //     wasAssociatedWith_info.activity = newChapter.activities[0]
  //     newChapter.provenanceInfo = newChapter.provenanceInfo.concat(wasAssociatedWith_info)

  //     let actedOnBehalfOf_info = new ActedOnBehalfOf()
  //     actedOnBehalfOf_info.agent1 = newChapter.agents[0];
  //     actedOnBehalfOf_info.agent2 = newChapter.agents[1]
  //     newChapter.provenanceInfo = newChapter.provenanceInfo.concat(actedOnBehalfOf_info)
  //   }

  //   datasourceProvenance.story = [newChapter]
  //   datasourceProvenance.id = this.tx.stub.generateUUID(`datasourceProvenance-${datasourceProvenance.associated_with_obj_id}-${datasourceProvenance.object_type}`)
  //   return await datasourceProvenance.save()
  // }

  


  // public async onUpdatedChapterComponent(currentSender: User, userInfoAssociatied: any, currentResource: Resource, resourceInfo: any, detailDifference: any) {
  //   let chapter = await this.onCreateAgentsAndEntity(currentSender, userInfoAssociatied, currentResource, resourceInfo)
  //   let activitity = this.createActivityWithName('update_resource')
  //   activitity.info = detailDifference
  //   chapter.activities = [activitity]
  //   return chapter
  // }
  // public async updateProvenanceInfo(updatedResource: Resource, currentSender: User, resourceInfo: any, detailDifference: any) {
  //   let lstDataProvenance = await DataProvenance.query(DataProvenance, {
  //     "selector": {
  //       type: new DataProvenance().type,
  //       associated_with_obj_id: updatedResource.id,
  //       object_type: new Resource().type
  //     }
  //   }) as DataProvenance[]

  //   if (lstDataProvenance.length !== 1) {
  //     throw new Error('Cannot find story related to this resource ' + resourceInfo['id'] + 'from ' + resourceInfo['source'])
  //   }
  //   let currentDataProvenance = lstDataProvenance[0]
  //   let userInfoAssociatied = { ...resourceInfo['user'] }
  //   // manually remove user info
  //   delete resourceInfo["user"]


  //   let newChapter = await this.onUpdatedChapterComponent(currentSender, userInfoAssociatied, updatedResource, resourceInfo, detailDifference)
  //   // create provenance info
  //   let wasGeneratedBy_info = new WasGeneratedBy()
  //   wasGeneratedBy_info.entity = newChapter.entities[0]
  //   wasGeneratedBy_info.activity = newChapter.activities[0]
  //   newChapter.provenanceInfo = [wasGeneratedBy_info]

  //   let isHaveUserAssociated: boolean = newChapter.agents.length > 1
  //   let wasAttributedTo_info = new WasAttributedTo()
  //   wasAttributedTo_info.entity = newChapter.entities[0]
  //   wasAttributedTo_info.agent = isHaveUserAssociated ? newChapter.agents[1] : newChapter.agents[0]
  //   newChapter.provenanceInfo = newChapter.provenanceInfo.concat(wasAttributedTo_info)

  //   if (isHaveUserAssociated) {
  //     let wasAssociatedWith_info = new WasAssociatedWith()
  //     wasAssociatedWith_info.agent = newChapter.agents[0]
  //     wasAssociatedWith_info.activity = newChapter.activities[0]
  //     newChapter.provenanceInfo = newChapter.provenanceInfo.concat(wasAssociatedWith_info)

  //     let actedOnBehalfOf_info = new ActedOnBehalfOf()
  //     actedOnBehalfOf_info.agent1 = newChapter.agents[0];
  //     actedOnBehalfOf_info.agent2 = newChapter.agents[1]
  //     newChapter.provenanceInfo = newChapter.provenanceInfo.concat(actedOnBehalfOf_info)
  //   }
  //   currentDataProvenance.story = currentDataProvenance.story.concat(newChapter)
  //   return await currentDataProvenance.save()

  // }

}