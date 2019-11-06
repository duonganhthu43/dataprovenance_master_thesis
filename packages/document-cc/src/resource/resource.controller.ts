import { ChaincodeTx } from '@worldsibu/convector-platform-fabric';
import {
  Controller,
  ConvectorController,
  Invokable,
  Param
} from '@worldsibu/convector-core';
import { Resource } from './resource.model';
import * as yup from 'yup';
import { BaseProvController } from '../common';
import { User } from '../user/user.model';
import { DataProvenance, Agent, Entity, Activity, WasGeneratedBy, WasAttributedTo, WasAssociatedWith, ActedOnBehalfOf, Chapter, ProvenananeGenerator } from '../data-provenance';
import { Utilities } from '../common/utilities';
import { History } from '@worldsibu/convector-core';

@Controller('resource')
export class ResourceController extends BaseProvController<Resource> {
  async onDelete_validate(modelInfo: any, sender: User): Promise<Resource> {
    return await Resource.getOne(modelInfo.id)
  }

  async onUpdate_Validate(modelInfo: any): Promise<Resource> {
    let lstResource = await Resource.query(Resource, {
      "selector": {
        type: new Resource().type,
        "id": modelInfo['id'],
        'source': modelInfo['source']
      }
    }) as Resource[]
    if (lstResource.length !== 1) {
      throw new Error('Theres no resource related to id' + modelInfo['id'] + 'from ' + modelInfo['source'])
    }
    return lstResource[0]
  }

  async onUpdate(oldModel: Resource, newInfo: any, sender: User): Promise<Resource> { return this.mappingValue(newInfo, oldModel) }
  async onFindDiff(oldValue: any, newValue: any): Promise<any[]> { return Utilities.findDiff(oldValue, newValue, {}) }

  async onCreateProv(currentSender: User, dataset: Resource, dataInfo: any) {
    return await this.provenanceInfo_create(dataset, currentSender, dataInfo)
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

  async associatedAgent_create(newValue: Resource, info: any): Promise<Agent[]> {
    let userInfoAssociatied = { ...info['user'] }
    if (!userInfoAssociatied || Object.keys(userInfoAssociatied).length < 1) { return [] }
    let associatedAgent = new Agent()
    associatedAgent.info = userInfoAssociatied
    associatedAgent.name = userInfoAssociatied['name']
    let userByID = await Utilities.findUserById(userInfoAssociatied['id'])
    if (userByID) {
      associatedAgent.id = userByID.id
      associatedAgent.associated_type = userByID.type
      associatedAgent.name = userByID.name
      associatedAgent.info = userByID.toJSON(true)
    } else {
      associatedAgent.id = userInfoAssociatied['id']
    }
    return [associatedAgent]
  }

  @Invokable()
  public async create(@Param(yup.object()) resourceInfo: any) { return await super.create(resourceInfo) }



  @Invokable()
  public async create_multiple(@Param(yup.object()) resourceArray: any) {
     return await super.createMultiple(resourceArray.resources)
  }

  @Invokable()
  public async batch_update(@Param(yup.object()) datasetInfo: any) { return await super.batchUpdate(datasetInfo) }

  @Invokable()
  public async update(@Param(yup.object()) resourceInfo: any) { return await super.baseUpdate(resourceInfo) }
  
  @Invokable()
  public async getprovenance(
    @Param(yup.object())
    resourceInfo: any
  ) {
    let currentSender = await this.validateCurrentSender()
    let lstDataProvenance = await DataProvenance.query(DataProvenance, {
      "selector": {
        type: new DataProvenance().type,
        associated_with_obj_id: resourceInfo['resourceId'],
        object_type: new Resource().type
      }
    }) as DataProvenance[]

    if (lstDataProvenance.length !== 1) {
      throw new Error('Cannot find provenance related to this dataset ' + resourceInfo['resourceId'] + 'from ' + resourceInfo['source'])
    }
    let currentDataProvenance = lstDataProvenance[0]
    return ProvenananeGenerator.generateProvStoryJS(currentDataProvenance.story)
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
    return <Resource[]>lstResource.map(value => value.toJSON(true))
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

  @Invokable()
  public async gethistory(
    @Param(yup.object())
    resourceInfo: any
  ): Promise<History<Resource>[]> {
    try {
      let currentSender = await this.validateCurrentSender()
      let listResource = await Resource.query(Resource, {
        "selector": {
          type: new Resource().type,
          id: resourceInfo['resourceInfo']
        }
      }) as Resource[]
      if (listResource && listResource.length > 0) {
        let firstResult = listResource[0]
        return await firstResult.history()
      }
      return []
    } catch (err) {
      console.log('==== resource History error ')
    }
  }

  @Invokable()
  public async getbyid(
    @Param(yup.object())
    resourceInfo: any
  ) {
    try {
      let currentSender = await this.validateCurrentSender()
      let lstResource = await Resource.query(Resource, {
        "selector": {
          type: new Resource().type,
          id: resourceInfo['resource_id']
        }
      }) as Resource[]
      if (lstResource && lstResource.length > 0) {
        let firstResource = lstResource[0]
        return <Resource>firstResource.toJSON(true)
      }
      return []
    }
    catch (err) {
      console.log('=== error in getbyid', err)
    }
  }
}