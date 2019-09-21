import { ChaincodeTx } from '@worldsibu/convector-platform-fabric';
import {
  Controller,
  ConvectorController,
  Invokable,
  Param
} from '@worldsibu/convector-core';
import { Resource } from './resource.model';
import * as yup from 'yup';
import * as crypto from 'crypto';
import { BaseController } from '../common';

@Controller('resource')
export class ResourceController extends BaseController {
  @Invokable()
  public async create(
    @Param(yup.object())
    resourceInfo: any
  ) {
    await this.validateCurrentSender()
    let lstResource = await Resource.query(Resource, {
      "selector": {
        type: new Resource().type,
        "resourceInfo": {
          "id": resourceInfo['id'],
          'source': resourceInfo['source']
        }
      }
    }) as Resource[]
    if (lstResource.length > 0) {
      throw new Error('There already existed resource with id' + resourceInfo['id'] + 'from ' + resourceInfo['source'])
    }

    let newResource = new Resource()
    newResource.createAuditField(this.sender)
    newResource = this.mappingValue(resourceInfo, newResource)
    newResource.id = newResource.id ? resourceInfo.id : this.tx.stub.generateUUID(JSON.stringify(resourceInfo))
    await newResource.save();
    return <Resource>newResource.toJSON()
  }
  @Invokable()
  public async update(
    @Param(yup.object())
    resourceInfo: any
  ) {
    await this.validateCurrentSender()
    let lstResource = await Resource.query(Resource, {
      "selector": {
        type: new Resource().type,
        "resourceInfo": {
          "id": resourceInfo['id'],
          'source': resourceInfo['source']
        }
      }
    }) as Resource[]
    if (lstResource.length !== 1) {
      throw new Error('Theres no resource related to id' + resourceInfo['id'] + 'from ' + resourceInfo['source'])
    }
    let resource = lstResource[0]

    let newHash = crypto.createHmac('sha256', JSON.stringify(resourceInfo))
    let oldHash = crypto.createHmac('sha256', JSON.stringify(resource.resourceInfo))
    if (newHash === oldHash) { return resource }
    resource = this.mappingValue(resourceInfo, resource)
    resource.updateAuditField(this.sender)
    await resource.save();
    return <Resource>resource.toJSON()
  }

  private mappingValue(source: any, destination: Resource) {
    let newDestination = destination
    newDestination.file_hash = source['file_hash']
    newDestination.name = source['name']
    delete source["topic"]
    newDestination.resourceInfo = source
    if (source['size']) {
      newDestination.size = source['size']
    }
    if (source['package_id']) {
      newDestination.package_id = source['package_id']
    }

    if (source['state']) {
      newDestination.state = source['state']
    }

    if (source['file_path']) {
      newDestination.file_path = source['file_path']
    }

    if (source['description']) {
      newDestination.description = source['description']
    }

    if (source['format']) {
      newDestination.format = source['format']
    }

    if (source['mimetype_inner']) {
      newDestination.mimetype_inner = source['mimetype_inner']
    }
    if (source['url_type']) {
      newDestination.url_type = source['url_type']
    }
    if (source['cache_url']) {
      newDestination.cache_url = source['cache_url']
    }

    if (source['url']) {
      newDestination.url = source['url']
    }
    if (source['position']) {
      newDestination.position = source['position']
    }
    if (source['resource_type']) {
      newDestination.resource_type = source['resource_type']
    }

    if (source['source']) {
      newDestination.source = source['source']
    }

    return newDestination
  }
}