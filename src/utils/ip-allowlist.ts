import { BlockList, isIPv4, isIPv6 } from 'node:net';

const IPV4_MAPPED_PREFIX = '::ffff:';

/** Build a matcher for IPs and CIDR ranges such as "203.0.113.7" or "10.0.0.0/8". */
export function createIpMatcher(entries: readonly string[]): (ip: string | undefined) => boolean {
  const list = new BlockList();
  for (const entry of entries) {
    addEntry(list, entry);
  }

  return (ip: string | undefined): boolean => {
    if (!ip) {
      return false;
    }
    const address = ip.startsWith(IPV4_MAPPED_PREFIX) ? ip.slice(IPV4_MAPPED_PREFIX.length) : ip;
    if (isIPv4(address)) {
      return list.check(address, 'ipv4');
    }
    return isIPv6(address) && list.check(address, 'ipv6');
  };
}

function addEntry(list: BlockList, entry: string): void {
  const [address = '', prefix] = entry.split('/');
  const family = isIPv4(address) ? 'ipv4' : 'ipv6';
  if (!(isIPv4(address) || isIPv6(address))) {
    throw new Error(`Invalid IP address in allowlist: ${entry}`);
  }
  if (prefix === undefined) {
    list.addAddress(address, family);
    return;
  }
  list.addSubnet(address, Number(prefix), family);
}
