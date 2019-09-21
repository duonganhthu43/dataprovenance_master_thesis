import * as yup from 'yup';
import {
    ConvectorModel,
    Default,
    ReadOnly,
    Required,
    Validate
} from '@worldsibu/convector-core-model';
export class PortalCreateDTO extends ConvectorModel<PortalCreateDTO> {
    @ReadOnly()
    @Required()
    public readonly type = 'io.worldsibu.portal.createdto';

    @Required()
    @Validate(yup.string())
    public name: string;

    @Required()
    @Validate(yup.string())
    public email: string;

    @Required()
    @Validate(yup.string())
    public domain: string;

    @Required()
    public identities: Array<{
        status: boolean;
        fingerprint: string
    }>

    @Validate(yup.object())
    public attributes: Array<{ name: string, value: string }>;

    @Validate(yup.string())
    public description: string
}