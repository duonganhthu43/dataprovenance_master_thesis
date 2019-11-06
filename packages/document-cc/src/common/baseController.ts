import { ChaincodeTx } from '@worldsibu/convector-platform-fabric';
import {
    ConvectorController
} from '@worldsibu/convector-core';
import { User } from '../user/user.model'
import { BaseModel } from './baseModel.model';

export abstract class BaseController<T extends BaseModel<T>> extends ConvectorController<ChaincodeTx> {
    public checkingIfPortalUser(user: User) {
        let userTypeAttribute = user.attributes.find(att => att.name === 'user_type');
        let userType = userTypeAttribute ? userTypeAttribute.value : undefined
        return (!userTypeAttribute.expired) && userType === 'portal_user'
    }

    public checkingIfCasualUser(user: User) {
        let userTypeAttribute = user.attributes.find(att => att.name === 'user_type');
        let userType = userTypeAttribute ? userTypeAttribute.value : undefined
        return (!userTypeAttribute.expired) && userType === 'casual_user'
    }

    public getUserType(user: User) {
        let userTypeAttribute = user.attributes.find(att => att.name === 'user_type');
        let userType = userTypeAttribute ? userTypeAttribute.value : undefined
        return userTypeAttribute && !userTypeAttribute.expired ? userType : undefined
    }

    public async validateCurrentSender() {
        // make sure current sender is valid user 
        let listUserBySender = await User.query(User, {
            "selector": {
                "type": new User().type,
                "identities.0.fingerprint": this.sender,
                "identities.0.status": true
            }
        }) as User[]
        if (!listUserBySender || listUserBySender.length !== 1) {
            throw new Error('There is no valid or active credential available with current sender')
        }
        return listUserBySender[0]
    }
}
