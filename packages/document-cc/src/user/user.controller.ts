import { ChaincodeTx } from '@worldsibu/convector-platform-fabric';
import {
  Controller,
  Invokable,
  Param
} from '@worldsibu/convector-core';
import { User } from './user.model';
import { Attribute, BaseController } from '../common'
import * as yup from 'yup';
@Controller('user')
export class UserController extends BaseController {
  @Invokable()
  public async create(
    @Param(yup.object())
    user: any
  ) {
    
    // checking if is portal user
    let senderUser = await this.validateCurrentSender()
    let isPortalUser = await this.checkingIfPortalUser(senderUser)
    if(!isPortalUser) {
      throw new Error('Current sender must be portal_user to allow created new user')
    }
    let listUser = await User.query(User, {
      "selector": {
        "userData": {
          "id": user['id'],
          'source': user['source']
        }
      }
    })
    if (Array.isArray(listUser)) {
      listUser = <User[]>listUser
      if (listUser.length > 0) {
        throw new Error('There already existed user with id' + user['id'] + 'from ' + user['source']
        )
      }
    }
    let requiredField = ['name', 'email']
    requiredField.forEach(value => {
      if (!user[value]) {
        throw new Error(`user data must have ${value} value `)
      }
    })

    let newUser = new User()
    newUser.createAuditField(this.sender)
    newUser.name = user['name']
    newUser.email = user['email']
    newUser.userData = user
    newUser.id = user['id'] ? user['id'] : this.tx.stub.generateUUID(JSON.stringify(user))
    newUser.addAttribute('user_type', 'casual_user', this.sender)
    await newUser.save();
    return <User>newUser.toJSON()
  }


  @Invokable()
  public async updateUserIdentities(
    @Param(yup.object())
    userUpdateDTO: any
  ) {
    let userId = userUpdateDTO.userId
    let fingerprint = userUpdateDTO.fingerprint
    // make sure current sender is valid user 
    let listUserBySender = <User[]>await User.query(User, {
      "selector": {
        "type": new User().type,
        "identities.0.fingerprint": this.sender,
        "identities.0.status": true
      }
    })
    console.log('==== make sure current sender is valid user ', JSON.stringify(listUserBySender))

    if (!listUserBySender || listUserBySender.length !== 1) {
      throw new Error('There is no valid credential available with current sender')
    }
    // checking if is portal user
    let senderUser = listUserBySender[0]
    let userTypeAttribute = senderUser.attributes.find(att => att.name === 'user_type');
    let userType = userTypeAttribute ? userTypeAttribute.value : undefined
    //portal_user

    let listUser = <User[]>await User.query(User, {
      "selector": {
        "userData": {
          "id": userId,
        }
      }
    })
    if (!listUser || listUser.length < 1) {
      throw new Error('Cannot find user with input id: ' + userId)
    }
    let userById = listUser[0]
    // valid to update user identities if : portal_user and source is the same domain
    // or : current active fingerprint the same as sender
    var isValid = userType === 'portal_user' || (userById.identities && userById.identities.length > 0 && userById.identities.filter(identity => identity.fingerprint === this.sender && identity.status).length > 0)
    if (!isValid) {
      throw new Error('Sender is not valid to update identites, must be portal_user or current active identity of user')
    }
    userById.updateIdentities(fingerprint, this.sender)
    await userById.save
    return <User>userById.toJSON()
  }

  @Invokable()
  public async addAttribute(
    @Param(yup.string())
    userId: string,
    @Param(Attribute.schema())
    attribute: Attribute
  ) {
    let currentSender = await this.validateCurrentSender()
    // Check if the "stated" certifier of the attribute is actually the one making the request
    let certifier = await User.getOne(attribute.certifierID);

    if (!certifier || !certifier.identities) {
      throw new Error(`No user found with id ${attribute.certifierID}`);
    }

    const certifierActiveIdentity = certifier.getActiveIdentity()

    if (!certifierActiveIdentity) {
      throw new Error('No active identity found for participant');
    }

    if (this.sender !== certifierActiveIdentity.fingerprint) {
      throw new Error(`Requester identity cannot sign with the current certificate ${this.sender}. This means that the user requesting the tx and the user set in the param certifierId do not match`);
    }

    let userAffect = await User.getOne(userId);

    if (!userAffect || !userAffect.id) {
      throw new Error(`No user found with id ${userId}`);
    }

    let exists = userAffect.attributes && userAffect.attributes.find(attr => attr.id === attribute.id);

    if (!!exists) {
      let attributeOwner = await User.getOne(exists.certifierID);
      let attributeOwnerActiveIdentity = attributeOwner.identities.find(
        identity => identity.status === true);

      // Already has one, let's see if the requester has permissions to update it
      if (this.sender !== attributeOwnerActiveIdentity.fingerprint) {
        throw new Error(`User already has an attribute for ${attribute.id} but current identity cannot update it`);
      }
      // update as is the right attribute certifier
      exists = attribute;
    } else {
      userAffect.addAttributeObj(attribute,this.sender);
    }

    await userAffect.save();
  }


  @Invokable()
  public async update(
    @Param(yup.object())
    user: any
  ) {
    // make sure current sender is valid user 
    let senderUser = await this.validateCurrentSender()
    
    //portal_user

    let listUser = <User[]>await User.query(User, {
      "selector": {
        "userData": {
          "id": user['id'],
          'source': user['source']
        }
      }
    })
    if (!listUser || listUser.length !== 1) {
      throw new Error('There is no exist user to update')
    }
    let updatedUser = listUser[0]
    var isValid = this.checkingIfPortalUser(senderUser) || (updatedUser.identities && updatedUser.identities.length > 0 && updatedUser.identities.filter(identity => identity.fingerprint === this.sender && identity.status).length > 0)
    if (!isValid) {
      throw new Error('Sender is not valid to update identites, must be portal_user or current active identity of user')
    }
    updatedUser.name = user['name']
    updatedUser.email = user['email']
    updatedUser.userData = user
    updatedUser.updateAuditField(this.sender)
    await updatedUser.save();
    console.log('==== updated user ', JSON.stringify(updatedUser))
    return <User>updatedUser.toJSON()
  }


  @Invokable()
  public async query(
    @Param(yup.object())
    userCriteria: any
  ) {
    let senderUser = await this.validateCurrentSender()

    // make sure current sender is valid user 
    let lstUserByCriteria = <User[]>await User.query(User, {
      "selector": {
        "type": new User().type,
        "id": userCriteria.userId,
        "userData.apikey": userCriteria.apikey,
        "userData.email": userCriteria.email
      }
    })

    if (!lstUserByCriteria || lstUserByCriteria.length !== 1) {
      throw new Error('There is no valid credential available with current criteria')
    }
    let userByCriteria = lstUserByCriteria[0]    
    //portal_user
    var isValid = this.checkingIfPortalUser(senderUser) || (userByCriteria.identities && userByCriteria.identities.length > 0 && userByCriteria.identities.filter(identity => identity.fingerprint === this.sender && identity.status).length > 0)
    if (!isValid) {
      throw new Error('Sender is not valid to querry user info')
    }
    return <User>userByCriteria.toJSON()
  }
}