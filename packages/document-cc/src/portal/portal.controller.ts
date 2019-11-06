import {
  Controller,
  Invokable,
  Param,
  BaseStorage,
} from '@worldsibu/convector-core';
import * as yup from 'yup';
import { Portal } from './portal.model';
import { ClientIdentity } from 'fabric-shim';
import { PortalCreateDTO } from './portal.dto';
import { User } from '../user'
import { Attribute, BaseController, x509Identities } from '../common'
import * as crypto from 'crypto';

@Controller('portal')
export class PortalController extends BaseController<Portal> {
  onCreate(modelInfo: any, sender: User): Promise<Portal> {
    return null
    //throw new Error("Method not implemented.");
  }
  onCreateProv(currentSender: User, data: Portal) {
    //throw new Error("Method not implemented.");
  }
  get fullIdentity(): ClientIdentity {
    const stub = (BaseStorage.current as any).stubHelper;
    return new ClientIdentity(stub.getStub());
  };
  get portalID(): string {
    return PortalController.getPortalIdWithIdentity(this.fullIdentity)
  }

  public static getPortalIdWithIdentity(identity: ClientIdentity): string {
    const currentCert = identity.getX509Certificate()
    let extensions;
    let subjectHash;
    let authorityKeyIdentifier;
    let OID;
    if (currentCert && currentCert['extensions']) {
      extensions = currentCert['extensions']
    }
    if (currentCert && currentCert['subjectHash']) {
      subjectHash = currentCert['subjectHash']
    }
    if (extensions && extensions['authorityKeyIdentifier']) {
      authorityKeyIdentifier = extensions['authorityKeyIdentifier']
    }
    // if (extensions && extensions['1.2.3.4.5.6.7.8.1']) {
    //   OID = extensions['1.2.3.4.5.6.7.8.1']
    // }
    // if (!extensions || !subjectHash || !authorityKeyIdentifier || !OID) {
    //   throw new Error('Certificate of Sender is not valid')
    // }
    return crypto.createHmac('sha256', `${extensions}-${subjectHash}-${authorityKeyIdentifier}`).digest('hex')
  }

  @Invokable()
  public async test111() {
    console.log
    return "777"
  }
  @Invokable()
  public async create(
    @Param(yup.object())
    portal: PortalCreateDTO
  ) {
    console.log('===== create portal ', this.sender)
    let newPortal = new Portal();
    newPortal.createAuditField(this.sender)
    newPortal.id = this.portalID
    newPortal.name = portal.name
    newPortal.MSP = this.fullIdentity.getMSPID();
    newPortal.identities = portal.identities && portal.identities.map( value => new x509Identities(value.status, value.fingerprint))
    if (portal.attributes && portal.attributes.length > 0) {
      newPortal.attributes = portal.attributes.map(att => new Attribute(att.name, att.value, this.sender))
    }
    await newPortal.save();
    let portalUser = new User()
    portalUser.created = Date.now()
    portalUser.name = `${newPortal.name.trim().replace(' ', '')}_admin`
    portalUser.email = 'portal@email.com'
    portalUser.createAuditField(this.sender)
    portalUser.userData = {
      name: portal.name,
      state: "active",
      user_type: 'portal_user',
      role: 'portal_admin',
      portalId: this.portalID
    }
    portalUser.id = this.tx.stub.generateUUID(`${portalUser.name}-${portalUser.modified}`)
    portalUser.identities = portal.identities && portal.identities.map( value => new x509Identities(value.status, value.fingerprint))
    let userTypeAtt = new Attribute('user_type', 'portal_user',this.sender)
    portalUser.attributes = [userTypeAtt]
    await portalUser.save();
    return <Portal>newPortal.toJSON(true);
  }
}