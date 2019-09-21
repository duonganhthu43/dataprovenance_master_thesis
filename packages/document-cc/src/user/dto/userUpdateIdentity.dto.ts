import * as yup from 'yup';
import {
    ConvectorModel,
    Default,
    ReadOnly,
    Required,
    Validate
} from '@worldsibu/convector-core-model';
export class UserUpdateIdentityDTO extends ConvectorModel<UserUpdateIdentityDTO> {
    @ReadOnly()
    public readonly type = 'io.worldsibu.portal.userupdateindentityDTO';

    @Required()
    @Validate(yup.string())
    public userId: string;

    @Required()
    @Validate(yup.string())
    public fingerprint: string;
}