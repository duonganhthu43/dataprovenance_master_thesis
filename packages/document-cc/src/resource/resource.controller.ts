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
  async onCreateProv(currentSender: User, dataset: Resource, dataInfo: any) {
    return await this.createProvenanceInfo(dataset,currentSender,dataInfo)
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
    await this.updateProvenanceInfo(resource, currentSender, newValue, diff, oldValue)

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
}