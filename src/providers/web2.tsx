import * as cheerio from 'cheerio';
import TikToken from '@providers/tiktoken/contract';
import { Address } from 'viem';

export type FQID = `#${string}@${string}`
export interface UserData {
    platform: string
    id: string
    handle: string
    name: string
    registerDate?: Date
    smImage: URL
    mdImage: URL
    lgImage: URL
    bio: string
    verified: boolean | string
    followers: number
    following: number
    likes: number
    posts: number
    hasMinted: boolean
    account: Address
    isDefault: boolean | null
}

// export interface ProfileData {

// }

export async function getDefaultId(account: Address): Promise<FQID> {
    const ids = await TikToken.getUserIDs(account)
    if (ids.length > 0) {
        const lastId = ids[ids.length - 1]
        if (lastId.startsWith('#') && lastId.includes('@')) {
            return lastId as FQID
        }
        return ('#tiktok@' + lastId) as FQID
    }
    return '#@' as FQID
}
export function isNum(value: string) {
    return /^\d+$/.test(value);
}

export function getDateFromTikTokId(idNum: string): Date {
    // Convert the video ID to a BigInt to ensure it can handle large numbers
    const bigIntID = BigInt(idNum);

    // Convert the video ID to binary and take the first 32 bits
    let binaryString = bigIntID.toString(2);
    // console.log(binaryString)
    while (binaryString.length < 64) {
        binaryString = '0' + binaryString
        // console.log(binaryString.length)
    }

    //pad string to 64 chars
    const first32Bits = binaryString.slice(0, 32);
    // console.log(binaryString)
    // console.log(first32Bits)
    // Convert the first 32 bits back to decimal to get the Unix timestamp
    const unixTimestamp = parseInt(first32Bits, 2);
    const registerDate = unixTimestamp > 1400000000 ? unixTimestamp : 1500000000
    return new Date(registerDate * 1000);
}

export async function getTiktokData(user: string): Promise<UserData> {
    const url = new URL(`https://tiktok.com/@${user}`)

    const response = await fetch(url)

    const html = await response.text()

    const $ = cheerio.load(html)
    // console.log(html)
    const appContext = $("#SIGI_STATE").text();
    // console.log(appContext.split('users')[1])
    const json = JSON.parse(appContext);
    // console.log(json)

    let userData = json.UserModule['users'];
    const handle = Object.keys(userData)[0];
    // console.log(handle)
    userData = userData[handle]
    const platform = 'TikTok'
    const idNum = userData.id
    const id = userData.secUid
    const fqid: FQID = `#${platform.toLowerCase()}@${idNum}` // fully qualified identifier
    const name = userData.nickname
    const date = getDateFromTikTokId(idNum)
    const lgImage = userData.avatarLarger
    const mdImage = userData.avatarMedium
    const smImage = userData.avatarThumb
    const bio = userData.signature
    const verified = userData.verified
    const statsData = json.UserModule['stats'][handle];
    const followers = statsData.followerCount
    const following = statsData.followingCount
    const likes = statsData.heartCount
    const posts = statsData.videoCount
    const hasMinted = await TikToken.hasMinted(idNum)
    const account = await TikToken.getUserAccount(idNum)
    const isDefault = hasMinted ? await getDefaultId(account) == fqid ? true : false : null

    const data: UserData = {
        platform: platform,
        id: idNum,
        handle: handle,
        name: name,
        registerDate: date,
        smImage: smImage,
        mdImage: mdImage,
        lgImage: lgImage,
        bio: bio,
        verified: verified,
        followers: followers,
        following: following,
        likes: likes,
        posts: posts,
        hasMinted: hasMinted,
        account: account,
        isDefault: isDefault,
    }

    return data
}

export async function getUserData(platform: string, id: string) {
    switch (platform) {
        case 'dev':
        case 'developer':
            const isDev = id == 'mancinotech'
            return `${id} isDev: ${isDev}`
        case 'tiktok':
                return await getTiktokData(id)
        default:
            return "unsupported platform"
    }
}