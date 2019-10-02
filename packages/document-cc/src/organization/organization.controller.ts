import {
  Controller,
  Invokable,
  Param
} from '@worldsibu/convector-core';
import { Organization } from './organization.model';
import * as yup from 'yup';
import * as crypto from 'crypto';
import { BaseController } from '../common';

@Controller('organization')
export class OrganizationController extends BaseController<Organization> {
  async onCreate(modelInfo: any, sender: import("../user").User): Promise<Organization> {
    let lstOrganization = await Organization.query(Organization, {
      "selector": {
        type: new Organization().type,
        "organizationInfo": {
          "id": modelInfo['id'],
          'source': modelInfo['source']
        }
      }
    }) as Organization[]
    if (lstOrganization.length > 0) {
      throw new Error('There already existed organization with id' + modelInfo['id'] + 'from ' + modelInfo['source'])
    }

    let newOrganization = new Organization()
    newOrganization.createAuditField(this.sender)
    newOrganization = this.mappingValue(modelInfo, newOrganization)
    newOrganization.id = newOrganization.id ? modelInfo.id : this.tx.stub.generateUUID(JSON.stringify(modelInfo))
    await newOrganization.save();
    return newOrganization
  }
  onCreateProv(currentSender: import("../user").User, data: Organization) {
    //throw new Error("Method not implemented.");
  }
  @Invokable()
  public async create(
    @Param(yup.object())
    organizationInfo: any
  ) {
    return await super.create(organizationInfo)
    // await this.validateCurrentSender()
    // let lstOrganization = await Organization.query(Organization, {
    //   "selector": {
    //     type: new Organization().type,
    //     "organizationInfo": {
    //       "id": organizationInfo['id'],
    //       'source': organizationInfo['source']
    //     }
    //   }
    // }) as Organization[]
    // if (lstOrganization.length > 0) {
    //   throw new Error('There already existed organization with id' + organizationInfo['id'] + 'from ' + organizationInfo['source'])
    // }

    // let newOrganization = new Organization()
    // newOrganization.createAuditField(this.sender)
    // newOrganization = this.mappingValue(organizationInfo, newOrganization)
    // newOrganization.id = newOrganization.id ? organizationInfo.id : this.tx.stub.generateUUID(JSON.stringify(organizationInfo))
    // await newOrganization.save();
    // return <Organization>newOrganization.toJSON()
  }
  @Invokable()
  public async update(
    @Param(yup.object())
    organizationInfo: any
  ) {
    await this.validateCurrentSender()
    let lstOrganization = await Organization.query(Organization, {
      "selector": {
        type: new Organization().type,
        "organizationInfo": {
          "id": organizationInfo['id'],
          'source': organizationInfo['source']
        }
      }
    }) as Organization[]
    if (lstOrganization.length !== 1) {
      throw new Error('Theres no organization related to id' + organizationInfo['id'] + 'from ' + organizationInfo['source'])
    }
    let organization = lstOrganization[0]

    let newHash = crypto.createHmac('sha256', JSON.stringify(organizationInfo))
    let oldHash = crypto.createHmac('sha256', JSON.stringify(organization.organizationInfo))
    if (newHash === oldHash) { return organization }
    organization = this.mappingValue(organizationInfo, organization)
    organization.updateAuditField(this.sender)
    await organization.save();
    return <Organization>organization.toJSON()
  }

  private mappingValue(source: any, destination: Organization) {
    let newDestination = destination
    newDestination.title = source['title']
    newDestination.name = source['name']
    newDestination.organizationInfo = source
    if (source['description']) {
      newDestination.description = source['description']
    }
    if (source['is_organization']) {
      newDestination.is_organization = source['is_organization']
    }

    if (source['state']) {
      newDestination.state = source['state']
    }

    if (source['image_url']) {
      newDestination.image_url = source['image_url']
    }
    if (source['approval_status']) {
      newDestination.approval_status = source['approval_status']
    }
    if (source['source']) {
      newDestination.source = source['source']
    }
    if (source['type']) {
      newDestination.organization_type = source['type']
    }
    return newDestination
  }
}