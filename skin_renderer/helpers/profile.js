const axios = require("axios")
const Jimp = require("jimp")
const bodyParts = require("./bodySection")
const MinecraftSkin = require("./3dRender")
const Redis = require("ioredis")

const redis = new Redis(process.env.REDIS_URL)

const steveDefault = {
    time: 0,
    uuid: "c06f89064c8a49119c29ea1dbd1aab82",
    name: "MHF_Steve",
    assets: {
        skin: {
            url: "https://textures.minecraft.net/texture/1a4af718455d4aab528e7a61f86fa25e6a369d1768dcb13f7df319a713eb810b",
            base64: "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAFhElEQVR4Xu1a328UVRjdR6UUKJFIKL90oa4Vs1TwgRItUvlljMYSjVIDBAzUloZkg5pIDFWJUE3UpyaQiokJSWM0PPjrwcAjT/2fPufc2TN++82dGcruTrfbOcnJ3L33u7f3nPvd2dm5LZUyMLitV8Bdm59wV5bBHRt65JNj1VTa8VYcKLi6Y72jNgCEyMlDe+Wbk/ujK9hVBlD8wJY1iQaUy+UGoq4rDODq223Auq43QItFBoB6O6wKA3ziswwYqwx0jwEU/vzWta6Mu781wMeuMYDCNZkZ+ivPRztex6HSv0ZAiHquv8eJfam8QV7cGbK6s1de2B7eBypbe9yNELGogwGMQx/0xRho57g0Kuk5ws4nd2gDwD3b1zkhELhvV5+7kvh8eHCjjAxucnEwhDHogzqOow1Ie46w88kdbtKbw1ULhQfC+rHS/Nwrf89ekvvf1+Th3Izc/64WlK/Ib5+ekv27N7oYxKIP+kbbJRgTY0Nw2nOEnU/ucCu1JUjlbevCVe0PtwLK1Wf75NcvLsif16fd9feZaZmvfSj/ztZk/uM3HRGDWPRBX5QxFsbE56znCDuf3MFUDbfBWik//aTceH9Y5s8fkeHKU048MPbKrPx19aITjzIAUxCDWPRBX4yhx9RiuT30drDzyR3RZIMVC9O2T66PDcncmdfk5qkDgbij8sfVc/LPV7Xo6+3BzUvyy+QxmQme+RGDWPRBX4zB1acBPvEdYwDTHml7brQqP02+LbfPvx79oPnx9Ggg8JB8dvjlBv5w+lX58uQBF4NY9EFfjOG2QH07UHzSc4SdT+7grzeKnr943K3otx8clCvHq3L5yB6ZHh10YsHP39onX7970BFlxCD254kTru/tj94Ir/XxaCQzgKRxdj7LjvdOLIpmpVJpoI2PYXEx9jAUPRQFbaWzZ9OZhYWFcBwwKGNLvjO0O7ra8CWjFQbYR2KyJQZQfJ2r24AgA7R49zeaRSsMsKnfzi3QtAF7KzUBB54Zd9ejw3cbqNts+/DQrJSuXfuf4+NSunVLSnfuuBsmvip580Sdo44HUQdR5L17Ifk5KZ4xtp39ySxQ4OMYALo/OjEREmVOvG5CJJ4T0vGgFq3JcXQsBbIPDbXtj2NAksCsdu8EOUlMEBmhRep40E5Ykyusx7eG2XY7RhayBGa1u7TnBFDWf5wG6LqkeMZBoC5bgTqb8soAHYN9rxkJITF5LZpl1utYGmBFq/54KCNvBA9f+P2hiTodY9ut3hh8BlCczoBEA7QYmKEN8AnThnEL+PrUU91nwNzl8Ugg61tqgM2AtPaYILv63LPWAKatR7Q2RIuzBuDqM8DV12Os3hgoLElgpgF2D2YZYL8FfLEJBtgVtgb4tojVG8OjGJDWHjOAgqwofk6L91CLSzLAZsiSDBgZGREwSSDrGTc1NdXASBCuzABSr36SATqeMSwH/bQ4a4AzQRnAdr1FrN4YKCxJYFa73iK4WgNBd7NUBuibKttdDLdJQN6EkwygSF+GLJsBvgxqMCEQlhbPGF1nV7jhBhjQd49YkgEFChQoUKBAgQIFChQoUKBAgQLNounDVbwVauXhZ95o2gBz/r/6DNAZsNiGf4BoN1pqwEIb/gWm1eDLTf2WV9O+BOXbXjJ6nU7qV+m+/yewZwfLjUc1IKndidLnBDz9pRG6XZ8krSQD0tpjBmhxMCGtvSsNaPX5f7uhxfkEWgPs8bo+1PCd7fkOPjTtfHIHxfmOupZiQNbRV0cbkJbiWe3WAH2sZQ1ghvBYbEUZQNp2e7hJYVEmqNX3bRE7n9yRJTCr3aa4zwBtUscZwFPjJIGsTzpdbhB/Jr7HG7JDGdQxWyDr+Dyr3bfCOgtWhQGkE6pucK5sMqTVBvwH+QeX13iz8VkAAAAASUVORK5CYII=",
            slim: false,
        },
    },
}

async function getBase64FromURL(url) {
    const binary = (await axios.get(url, {responseType: "arraybuffer"})).data
    return Buffer.from(binary, "binary").toString("base64")
}

async function _getProfile(texture) {
    const mojangTextures = `https://textures.minecraft.net/texture/${texture}`

    let newProfile = {
        uuid: 0,
        name: "",
        time: Date.now(),
        assets: {
            skin: {
                url: mojangTextures,
                base64: await getBase64FromURL(mojangTextures),
                slim: false,
            },
        },
    }

    return newProfile
}

async function getProfile(texture) {
    const newProfile = await _getProfile(texture)
    return newProfile
}

function useSecondLayer(skin) {
    const newFormat = skin.bitmap.height === 64
    const secondLayer = skin.hasAlpha()

    return newFormat && secondLayer
}

async function getSkin64(texture) {
    redis.get(`getSkin64_${texture}`, async (error, result) => {
        if (error) throw error
        if (result !== null) {
            console.log(`redis : ${result}`)
            return result
        } else {
            const profile = await getProfile(texture)
            console.log(`dynamic : ${profile}`)
            const base = profile.assets.skin.base64
            redis.set(`getSkin64_${texture}`, base, "ex", 600)
            return base
        }
    })
}

async function renderHead64(skinBuffer, width, height, overlay = true) {
    const bottom = await Jimp.read(skinBuffer)
    const applySecondLayer = useSecondLayer(bottom)

    bottom.crop(...bodyParts.firstLayer.head.front)

    if (overlay && applySecondLayer) {
        const top = await Jimp.read(skinBuffer)
        top.crop(...bodyParts.secondLayer.head.front)
        bottom.composite(top, 0, 0)
    }

    bottom.resize(width, height, Jimp.RESIZE_NEAREST_NEIGHBOR)

    return bottom.getBase64Async(Jimp.MIME_PNG)
}

async function getHead64(texture, width, height, overlay = true) {
    const skin = await getSkin64(texture)
    const skinBuffer = new Buffer.from(skin, "base64")
    return renderHead64(skinBuffer, width, height, overlay)
}

async function renderBody64(skinBuffer, width = 160, height = 320, isSlim = false, overlay = true) {
    const skin = await Jimp.read(skinBuffer)
    const applySecondLayer = useSecondLayer(skin)

    const base = new Jimp(16, 32)
    const head = skin.clone()
    const torso = skin.clone()
    const lArm = skin.clone()
    const rArm = skin.clone()
    const lLeg = skin.clone()
    const rLeg = skin.clone()

    head.crop(...bodyParts.firstLayer.head.front)
    torso.crop(...bodyParts.firstLayer.torso.front)

    const lArmPoints = applySecondLayer
        ? [...bodyParts.firstLayer.arms.left.front]
        : [...bodyParts.firstLayer.arms.right.front]
    const lLegPoints = applySecondLayer
        ? [...bodyParts.firstLayer.legs.left.front]
        : [...bodyParts.firstLayer.legs.right.front]

    const rArmPoints = [...bodyParts.firstLayer.arms.right.front]

    if (isSlim) {
        lArmPoints[2] = lArmPoints[2] - 1
        rArmPoints[2] = rArmPoints[2] - 1
    }

    lArm.crop(...lArmPoints)
    rArm.crop(...rArmPoints)
    lLeg.crop(...lLegPoints)
    rLeg.crop(...bodyParts.firstLayer.legs.right.front)

    !applySecondLayer && lArm.flip(true, false) && lLeg.flip(true, false)

    base.composite(head, 4, 0)
    base.composite(torso, 4, 8)
    base.composite(lArm, 12, 8)
    base.composite(rArm, isSlim ? 1 : 0, 8)
    base.composite(lLeg, 8, 20)
    base.composite(rLeg, 4, 20)

    if (overlay && applySecondLayer) {
        try {
            const head2 = skin.clone()
            const torso2 = skin.clone()
            const lArm2 = skin.clone()
            const rArm2 = skin.clone()
            const lLeg2 = skin.clone()
            const rLeg2 = skin.clone()

            const lArmPoints2 = [...bodyParts.secondLayer.arms.left.front]
            const rArmPoints2 = [...bodyParts.secondLayer.arms.right.front]

            if (isSlim) {
                lArmPoints2[2] = lArmPoints2[2] - 1
                rArmPoints2[2] = rArmPoints2[2] - 1
            }

            head2.crop(...bodyParts.secondLayer.head.front)
            torso2.crop(...bodyParts.secondLayer.torso.front)
            lArm2.crop(...lArmPoints2)
            rArm2.crop(...rArmPoints2)
            lLeg2.crop(...bodyParts.secondLayer.legs.left.front)
            rLeg2.crop(...bodyParts.secondLayer.legs.right.front)

            base.composite(head2, 4, 0)
            base.composite(torso2, 4, 8)
            base.composite(lArm2, 12, 8)
            base.composite(rArm2, isSlim ? 1 : 0, 8)
            base.composite(lLeg2, 4, 20)
            base.composite(rLeg2, 8, 20)
        } catch (e) {
            log.debug(`2D Render - ${uuid} had no second layer.`)
        }
    }

    base.resize(width, height, Jimp.RESIZE_NEAREST_NEIGHBOR)

    return base.getBase64Async(Jimp.MIME_PNG)
}

async function get3DSkin(texture) {
    const skinB64 = await getSkin64(texture)
    const skin = new MinecraftSkin(Buffer.from(skinB64, "base64"), false, 400)
    return skin.getRender()
}

async function get3DHead(texture) {
    const skinB64 = await getSkin64(texture)
    const skin = new MinecraftSkin(Buffer.from(skinB64, "base64"), false, 400)
    return skin.getHead()
}

module.exports = {
    steveDefault,
    getProfile,
    getSkin64,
    getHead64,
    get3DHead,
    get3DSkin,
    renderHead64,
    renderBody64,
}