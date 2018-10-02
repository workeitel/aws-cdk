import cdk = require('@aws-cdk/cdk');
import { ContainerImage } from './container-image';
import { cloudformation } from './ecs.generated';
import { LinuxParameters } from './linux-parameters';
import { LogDriver } from './log-drivers/log-driver';

export interface ContainerDefinitionProps {
  /**
   * A name for the container.
   */
  name: string;

  /**
   * The image to use for a container.
   *
   * You can use images in the Docker Hub registry or specify other
   * repositories (repository-url/image:tag).
   * TODO: Update these to specify using classes of ContainerImage
   */
  image: ContainerImage;

  /**
   * The CMD value to pass to the container.
   *
   * If you provide a shell command as a single string, you have to quote command-line arguments.
   *
   * @default CMD value built into container image
   */
  command?: string[];

  /**
   * The minimum number of CPU units to reserve for the container.
   */
  cpu?: number;

  /**
   * Indicates whether networking is disabled within the container.
   *
   * @default false
   */
  disableNetworking?: boolean;

  /**
   * A list of DNS search domains that are provided to the container.
   *
   * @default No search domains
   */
  dnsSearchDomains?: string[];

  /**
   * A list of DNS servers that Amazon ECS provides to the container.
   *
   * @default Default DNS servers
   */
  dnsServers?: string[];

  /**
   * A key-value map of labels for the container.
   *
   * @default No labels
   */
  dockerLabels?: {[key: string]: string };

  /**
   * A list of custom labels for SELinux and AppArmor multi-level security systems.
   *
   * @default No security labels
   */
  dockerSecurityOptions?: string[];

  /**
   * The ENTRYPOINT value to pass to the container.
   *
   * @see https://docs.docker.com/engine/reference/builder/#entrypoint
   * @default Entry point configured in container
   */
  entryPoint?: string[];

  /**
   * The environment variables to pass to the container.
   *
   * @default No environment variables
   */
  environment?: {[key: string]: string};

  /**
   * Indicates whether the task stops if this container fails.
   *
   * If you specify true and the container fails, all other containers in the
   * task stop. If you specify false and the container fails, none of the other
   * containers in the task is affected.
   *
   * You must have at least one essential container in a task.
   *
   * @default true
   */
  essential?: boolean;

  /**
   * A list of hostnames and IP address mappings to append to the /etc/hosts file on the container.
   *
   * @default No extra hosts
   */
  extraHosts?: {[name: string]: string};

  /**
   * Container health check.
   *
   * @default Health check configuration from container
   */
  healthCheck?: HealthCheck;

  /**
   * The name that Docker uses for the container hostname.
   *
   * @default Automatic hostname
   */
  hostname?: string;

  /**
   * The hard limit (in MiB) of memory to present to the container.
   *
   * If your container attempts to exceed the allocated memory, the container
   * is terminated.
   */
  memoryMiB?: number;

  /**
   * The soft limit (in MiB) of memory to reserve for the container.
   *
   * When system memory is under contention, Docker attempts to keep the
   * container memory within the limit. If the container requires more memory,
   * it can consume up to the value specified by the Memory property or all of
   * the available memory on the container instance—whichever comes first.
   */
  memoryReservationMiB?: number;

  /**
   * Indicates whether the container is given full access to the host container instance.
   *
   * @default false
   */
  privileged?: boolean;

  /**
   * Indicates whether the container's root file system is mounted as read only.
   *
   * @default false
   */
  readonlyRootFilesystem?: boolean;

  /**
   * The user name to use inside the container.
   *
   * @default root
   */
  user?: string;

  /**
   * The working directory in the container to run commands in.
   *
   * @default /
   */
  workingDirectory?: string;

  /**
   * Configures a custom log driver for the container.
   */
  logging?: LogDriver;
}

export class ContainerDefinition extends cdk.Construct {
  public readonly name: string;

  public readonly linuxParameters = new LinuxParameters();

  public readonly essential: boolean;

  private readonly links = new Array<string>();

  private _usesEcrImages: boolean = false;

  constructor(parent: cdk.Construct, id: string, private readonly props: ContainerDefinitionProps) {
    super(parent, id);
    this.name = props.name;
    this.essential = props.essential !== undefined ? props.essential : true;
    props.image.bind(this);
  }

  public addLink(container: ContainerDefinition, alias?: string) {
    if (alias !== undefined) {
      this.links.push(`${container.name}:${alias}`);
    } else {
      this.links.push(`${container.name}`);
    }
  }

  /**
   * Mark this ContainerDefinition as using an ECR image
   */
  public useEcrImage() {
    this._usesEcrImages = true;
  }

  public get usesEcrImages() {
    return this._usesEcrImages;
  }

  public loadBalancerPort(_classicLB: boolean): number {
    return 0;
  }

  public renderContainerDefinition(): cloudformation.TaskDefinitionResource.ContainerDefinitionProperty {
    return {
      command: this.props.command,
      cpu: this.props.cpu,
      disableNetworking: this.props.disableNetworking,
      dnsSearchDomains: this.props.dnsSearchDomains,
      dnsServers: this.props.dnsServers,
      dockerLabels: this.props.dockerLabels,
      dockerSecurityOptions: this.props.dockerSecurityOptions,
      entryPoint: this.props.entryPoint,
      essential: this.essential,
      hostname: this.props.hostname,
      image: this.props.image.imageName,
      memory: this.props.memoryMiB,
      memoryReservation: this.props.memoryReservationMiB,
      mountPoints: [], // FIXME
      name: this.props.name,
      portMappings: [], // FIXME
      privileged: this.props.privileged,
      readonlyRootFilesystem: this.props.readonlyRootFilesystem,
      repositoryCredentials: undefined, // FIXME
      ulimits: [], // FIXME
      user: this.props.user,
      volumesFrom: [], // FIXME
      workingDirectory: this.props.workingDirectory,
      logConfiguration: this.props.logging && this.props.logging.toLogDriverJson(),
      environment: this.props.environment && renderKV(this.props.environment, 'name', 'value'),
      extraHosts: this.props.extraHosts && renderKV(this.props.extraHosts, 'hostname', 'ipAddress'),
      healthCheck: this.props.healthCheck && renderHealthCheck(this.props.healthCheck),
      links: this.links,
      linuxParameters: this.linuxParameters.renderLinuxParameters(),
    };
  }
}

/**
 * Container health check configuration
 */
export interface HealthCheck {
  /**
   * Command to run, as the binary path and arguments.
   *
   * If you provide a shell command as a single string, you have to quote command-line arguments.
   */
  command: string[];

  /**
   * Time period in seconds between each health check execution.
   *
   * You may specify between 5 and 300 seconds.
   *
   * @default 30
   */
  intervalSeconds?: number;

  /**
   * Number of times to retry a failed health check before the container is considered unhealthy.
   *
   * You may specify between 1 and 10 retries.
   *
   * @default 3
   */
  retries?: number;

  /**
   * Grace period after startup before failed health checks count.
   *
   * You may specify between 0 and 300 seconds.
   *
   * @default No start period
   */
  startPeriod?: number;

  /**
   * The time period in seconds to wait for a health check to succeed before it is considered a failure.
   *
   * You may specify between 2 and 60 seconds.
   *
   * @default 5
   */
  timeout?: number;
}

// mountPoints?: mountPoint[];
// portMappings?: portMapping[];
// ulimits?: ulimit[];
// volumesFrom?: volumeFrom[];

function renderKV(env: {[key: string]: string}, keyName: string, valueName: string): any {
  const ret = [];
  for (const [key, value] of Object.entries(env)) {
    ret.push({ [keyName]: key, [valueName]: value });
  }
  return ret;
}

function renderHealthCheck(hc: HealthCheck): cloudformation.TaskDefinitionResource.HealthCheckProperty {
  return {
    command: getHealthCheckCommand(hc),
    interval: hc.intervalSeconds,
    retries: hc.retries,
    startPeriod: hc.startPeriod,
    timeout: hc.timeout
  };
}

function getHealthCheckCommand(hc: HealthCheck): string[] {
  const cmd = hc.command;
  const hcCommand = new Array<string>();

  if (cmd.length === 0) {
    throw new Error(`At least one argument must be supplied for health check command.`);
  }

  if (cmd.length === 1) {
    hcCommand.push('CMD-SHELL', cmd[0]);
    return hcCommand;
  }

  if (cmd[0] !== "CMD" || cmd[0] !== 'CMD-SHELL') {
    hcCommand.push('CMD');
  }

  return hcCommand.concat(cmd);
}
