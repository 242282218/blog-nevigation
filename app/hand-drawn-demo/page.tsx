'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Head from 'next/head';
import {
    HandDrawnBorder,
    PaperTexture,
    WashiTape,
    PolaroidFrame,
    HandwrittenText,
    InkSplatter,
    ScribbleButton,
    Sticker,
    DoodleDivider,
} from '../components/hand-drawn';
import { Heart, Star, ArrowRight, Sparkles } from 'lucide-react';

export default function HandDrawnDemoPage() {
    return (
        <>
            <Head>
                <title>手绘风格组件展示 | Hand-Drawn UI</title>
                <meta name="description" content="手绘、涂鸦、拼贴风格的 React 组件展示" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link 
                    href="https://fonts.googleapis.com/css2?family=Amatic+SC:wght@400;700&family=Caveat:wght@400;500;600;700&family=Indie+Flower&family=Permanent+Marker&family=Satisfy&display=swap" 
                    rel="stylesheet" 
                />
            </Head>

            <PaperTexture variant="cream" className="min-h-screen" intensity="medium">
                {/* 墨迹装饰 */}
                <InkSplatter 
                    variant="splatter" 
                    size="large" 
                    color="#8b7355" 
                    className="fixed top-10 right-10 opacity-20" 
                />
                <InkSplatter 
                    variant="drop" 
                    size="medium" 
                    color="#6b5b4f" 
                    className="fixed bottom-20 left-10 opacity-15" 
                />
                <InkSplatter 
                    variant="brush" 
                    size="small" 
                    color="#9b8b7f" 
                    className="fixed top-1/3 left-5 opacity-10" 
                />

                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-20">
                    
                    {/* 页面标题 */}
                    <motion.header 
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: -30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <HandwrittenText 
                            as="h1" 
                            font="caveat" 
                            size="5xl" 
                            color="#3d3d3d"
                            className="mb-4"
                        >
                            手绘风格组件库
                        </HandwrittenText>
                        <HandwrittenText 
                            as="p" 
                            font="indie-flower" 
                            size="lg" 
                            color="#666"
                            irregular={false}
                        >
                            Hand-Drawn / Doodle / Collage Style UI Components
                        </HandwrittenText>
                        <DoodleDivider variant="scribble" color="#8b7355" className="max-w-xs mx-auto mt-6" />
                    </motion.header>

                    {/* 1. 手绘边框组件展示 */}
                    <section className="mb-20">
                        <div className="flex items-center gap-4 mb-8">
                            <Sticker shape="rounded" color="#e07a5f" className="w-16 h-12 text-sm">
                                01
                            </Sticker>
                            <HandwrittenText as="h2" font="caveat" size="3xl" color="#3d3d3d" underline>
                                手绘边框效果
                            </HandwrittenText>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <HandDrawnBorder color="#3d5a80" strokeWidth={2}>
                                <h3 className="font-bold text-lg mb-2" style={{ fontFamily: "'Caveat', cursive" }}>
                                    蜡笔质感边框
                                </h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    这个组件使用 SVG 滤镜模拟手绘边框的不规则边缘，
                                    带有轻微的噪点和粗糙感，营造出蜡笔或铅笔素描的效果。
                                </p>
                            </HandDrawnBorder>

                            <HandDrawnBorder color="#e07a5f" strokeWidth={3} fill="rgba(224, 122, 95, 0.05)">
                                <h3 className="font-bold text-lg mb-2" style={{ fontFamily: "'Caveat', cursive" }}>
                                    填充色边框
                                </h3>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    支持背景填充色，配合手绘边框创造出温暖的卡片效果。
                                    适合用于提示框、引用块等内容展示。
                                </p>
                            </HandDrawnBorder>

                            <HandDrawnBorder color="#81b29a" strokeWidth={2}>
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                        <Sparkles className="w-6 h-6 text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold" style={{ fontFamily: "'Caveat', cursive" }}>
                                            动态交互
                                        </h3>
                                        <p className="text-xs text-gray-500">悬停查看效果</p>
                                    </div>
                                </div>
                            </HandDrawnBorder>
                        </div>
                    </section>

                    {/* 2. 纸张纹理背景展示 */}
                    <section className="mb-20">
                        <div className="flex items-center gap-4 mb-8">
                            <Sticker shape="rounded" color="#3d5a80" className="w-16 h-12 text-sm">
                                02
                            </Sticker>
                            <HandwrittenText as="h2" font="caveat" size="3xl" color="#3d3d3d" underline>
                                纸张纹理背景
                            </HandwrittenText>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(['cream', 'white', 'kraft', 'graph', 'notebook'] as const).map((variant, index) => (
                                <motion.div
                                    key={variant}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <PaperTexture 
                                        variant={variant} 
                                        className="h-40 rounded-lg shadow-sm"
                                        intensity="medium"
                                    >
                                        <div className="h-full flex flex-col items-center justify-center p-6">
                                            <HandwrittenText 
                                                font="caveat" 
                                                size="xl" 
                                                color={variant === 'kraft' ? '#5a4a3a' : '#3d3d3d'}
                                            >
                                                {variant.charAt(0).toUpperCase() + variant.slice(1)} Paper
                                            </HandwrittenText>
                                            <p className={`text-xs mt-2 ${variant === 'kraft' ? 'text-amber-800' : 'text-gray-500'}`}>
                                                {variant === 'cream' && '奶油色纸张 - 温暖柔和'}
                                                {variant === 'white' && '纯白纸张 - 简洁干净'}
                                                {variant === 'kraft' && '牛皮纸张 - 复古质感'}
                                                {variant === 'graph' && '方格纸张 - 工程绘图'}
                                                {variant === 'notebook' && '笔记本纸 - 横线红边'}
                                            </p>
                                        </div>
                                    </PaperTexture>
                                </motion.div>
                            ))}
                        </div>
                    </section>

                    {/* 3. 和纸胶带效果展示 */}
                    <section className="mb-20">
                        <div className="flex items-center gap-4 mb-8">
                            <Sticker shape="rounded" color="#81b29a" className="w-16 h-12 text-sm">
                                03
                            </Sticker>
                            <HandwrittenText as="h2" font="caveat" size="3xl" color="#3d3d3d" underline>
                                和纸胶带装饰
                            </HandwrittenText>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <PaperTexture variant="white" className="p-8 rounded-lg shadow-sm">
                                <WashiTape color="pink" pattern="stripes" position="top-left" rotation={-5}>
                                    <WashiTape color="blue" pattern="dots" position="top-right" rotation={4}>
                                        <div className="pt-8">
                                            <h3 className="font-bold text-lg mb-3" style={{ fontFamily: "'Caveat', cursive" }}>
                                                手账风格装饰
                                            </h3>
                                            <p className="text-gray-600 text-sm leading-relaxed">
                                                和纸胶带是日本手账文化中常见的装饰元素。
                                                半透明质感、多样图案、可撕边缘，
                                                为页面增添温馨的手工感。
                                            </p>
                                        </div>
                                    </WashiTape>
                                </WashiTape>
                            </PaperTexture>

                            <div className="flex flex-wrap gap-4 items-center justify-center">
                                {(['pink', 'blue', 'yellow', 'green', 'purple', 'orange'] as const).map((color) => (
                                    <WashiTape 
                                        key={color}
                                        color={color} 
                                        pattern="stripes" 
                                        position="top" 
                                        width="100px"
                                        rotation={Math.random() * 6 - 3}
                                    >
                                        <div className="h-16 w-24" />
                                    </WashiTape>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 flex flex-wrap gap-6 justify-center">
                            {(['stripes', 'dots', 'grid', 'waves', 'solid'] as const).map((pattern) => (
                                <PaperTexture key={pattern} variant="cream" className="p-6 rounded-lg">
                                    <WashiTape color="purple" pattern={pattern} position="top" width="120px">
                                        <div className="pt-8 text-center">
                                            <span className="text-sm text-gray-600 capitalize">{pattern}</span>
                                        </div>
                                    </WashiTape>
                                </PaperTexture>
                            ))}
                        </div>
                    </section>

                    {/* 4. Polaroid 照片框展示 */}
                    <section className="mb-20">
                        <div className="flex items-center gap-4 mb-8">
                            <Sticker shape="rounded" color="#f2cc8f" className="w-16 h-12 text-sm">
                                04
                            </Sticker>
                            <HandwrittenText as="h2" font="caveat" size="3xl" color="#3d3d3d" underline>
                                Polaroid 照片框
                            </HandwrittenText>
                        </div>

                        <div className="flex flex-wrap gap-8 justify-center items-start">
                            <PolaroidFrame
                                src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop"
                                alt="Mountain landscape"
                                caption="山川风景"
                                size="medium"
                                rotation={-5}
                                tapeColor="pink"
                            />
                            <PolaroidFrame
                                src="https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=400&fit=crop"
                                alt="Nature scene"
                                caption="自然之美"
                                size="medium"
                                rotation={3}
                                tapeColor="blue"
                            />
                            <PolaroidFrame
                                src="https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=400&h=400&fit=crop"
                                alt="Forest path"
                                caption="林间小径"
                                size="medium"
                                rotation={-2}
                                tapeColor="yellow"
                            />
                        </div>
                    </section>

                    <DoodleDivider variant="wave" color="#8b7355" className="my-16" />

                    {/* 5. 手写字体排版展示 */}
                    <section className="mb-20">
                        <div className="flex items-center gap-4 mb-8">
                            <Sticker shape="rounded" color="#e07a5f" className="w-16 h-12 text-sm">
                                05
                            </Sticker>
                            <HandwrittenText as="h2" font="caveat" size="3xl" color="#3d3d3d" underline>
                                手写风格排版
                            </HandwrittenText>
                        </div>

                        <div className="space-y-8">
                            {(['caveat', 'indie-flower', 'permanent-marker', 'amatic', 'satisfy'] as const).map((font) => (
                                <PaperTexture key={font} variant="white" className="p-6 rounded-lg">
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        <div className="w-32 shrink-0">
                                            <span className="text-xs text-gray-500 uppercase tracking-wider">
                                                {font.replace('-', ' ')}
                                            </span>
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <HandwrittenText font={font} size="2xl" color="#3d3d3d">
                                                The quick brown fox jumps over the lazy dog.
                                            </HandwrittenText>
                                            <HandwrittenText font={font} size="lg" color="#666" irregular={false}>
                                                中文也支持手写风格排版效果
                                            </HandwrittenText>
                                        </div>
                                    </div>
                                </PaperTexture>
                            ))}
                        </div>

                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <PaperTexture variant="cream" className="p-6 rounded-lg text-center">
                                <HandwrittenText font="caveat" size="xl" color="#3d3d3d" underline>
                                    下划线效果
                                </HandwrittenText>
                            </PaperTexture>
                            <PaperTexture variant="cream" className="p-6 rounded-lg text-center">
                                <HandwrittenText font="caveat" size="xl" color="#3d3d3d" highlight highlightColor="rgba(255, 255, 0, 0.3)">
                                    高亮效果
                                </HandwrittenText>
                            </PaperTexture>
                            <PaperTexture variant="cream" className="p-6 rounded-lg text-center">
                                <HandwrittenText font="caveat" size="xl" color="#3d3d3d" underline highlight>
                                    组合效果
                                </HandwrittenText>
                            </PaperTexture>
                        </div>
                    </section>

                    {/* 6. 墨迹喷溅装饰展示 */}
                    <section className="mb-20">
                        <div className="flex items-center gap-4 mb-8">
                            <Sticker shape="rounded" color="#3d5a80" className="w-16 h-12 text-sm">
                                06
                            </Sticker>
                            <HandwrittenText as="h2" font="caveat" size="3xl" color="#3d3d3d" underline>
                                墨迹喷溅装饰
                            </HandwrittenText>
                        </div>

                        <div className="flex flex-wrap gap-8 justify-center items-center">
                            {(['splatter', 'drop', 'brush', 'stamp'] as const).map((variant) => (
                                <PaperTexture key={variant} variant="white" className="p-8 rounded-lg">
                                    <div className="flex flex-col items-center gap-4">
                                        <InkSplatter 
                                            variant={variant} 
                                            size="medium" 
                                            color="#2d2d2d" 
                                            opacity={0.8}
                                        />
                                        <span className="text-sm text-gray-600 capitalize">{variant}</span>
                                    </div>
                                </PaperTexture>
                            ))}
                        </div>

                        <div className="mt-8 relative h-48">
                            <InkSplatter variant="splatter" size="large" color="#8b4513" className="absolute top-0 left-10" />
                            <InkSplatter variant="drop" size="medium" color="#a0522d" className="absolute top-10 right-20" />
                            <InkSplatter variant="brush" size="small" color="#cd853f" className="absolute bottom-10 left-1/3" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <HandwrittenText font="caveat" size="3xl" color="#5a4a3a">
                                    艺术化的墨迹装饰
                                </HandwrittenText>
                            </div>
                        </div>
                    </section>

                    {/* 7. 涂鸦按钮展示 */}
                    <section className="mb-20">
                        <div className="flex items-center gap-4 mb-8">
                            <Sticker shape="rounded" color="#81b29a" className="w-16 h-12 text-sm">
                                07
                            </Sticker>
                            <HandwrittenText as="h2" font="caveat" size="3xl" color="#3d3d3d" underline>
                                涂鸦风格按钮
                            </HandwrittenText>
                        </div>

                        <PaperTexture variant="cream" className="p-8 rounded-lg">
                            <div className="flex flex-wrap gap-6 justify-center items-center">
                                <ScribbleButton variant="primary" size="medium">
                                    主要按钮
                                </ScribbleButton>
                                <ScribbleButton variant="secondary" size="medium">
                                    次要按钮
                                </ScribbleButton>
                                <ScribbleButton variant="outline" size="medium">
                                    轮廓按钮
                                </ScribbleButton>
                                <ScribbleButton variant="ghost" size="medium">
                                    幽灵按钮
                                </ScribbleButton>
                            </div>

                            <DoodleDivider variant="dots" color="#8b7355" className="my-8" />

                            <div className="flex flex-wrap gap-6 justify-center items-center">
                                <ScribbleButton variant="primary" size="small" icon={<Heart className="w-4 h-4" />}>
                                    喜欢
                                </ScribbleButton>
                                <ScribbleButton variant="secondary" size="medium" icon={<Star className="w-5 h-5" />} iconPosition="right">
                                    收藏
                                </ScribbleButton>
                                <ScribbleButton variant="primary" size="large" icon={<ArrowRight className="w-5 h-5" />} iconPosition="right">
                                    下一步
                                </ScribbleButton>
                            </div>
                        </PaperTexture>
                    </section>

                    {/* 8. 贴纸组件展示 */}
                    <section className="mb-20">
                        <div className="flex items-center gap-4 mb-8">
                            <Sticker shape="rounded" color="#f2cc8f" className="w-16 h-12 text-sm">
                                08
                            </Sticker>
                            <HandwrittenText as="h2" font="caveat" size="3xl" color="#3d3d3d" underline>
                                贴纸组件
                            </HandwrittenText>
                        </div>

                        <div className="flex flex-wrap gap-8 justify-center items-center">
                            <Sticker shape="circle" color="#e07a5f" rotation={-8}>
                                <span className="text-lg">NEW</span>
                            </Sticker>
                            <Sticker shape="rounded" color="#81b29a" rotation={5}>
                                <span className="text-lg">HOT</span>
                            </Sticker>
                            <Sticker shape="star" color="#f2cc8f" rotation={-3}>
                                <span className="text-sm">VIP</span>
                            </Sticker>
                            <Sticker shape="heart" color="#ff6b6b" rotation={4}>
                                <Heart className="w-6 h-6" />
                            </Sticker>
                        </div>

                        <div className="mt-8 flex flex-wrap gap-6 justify-center">
                            {['#e07a5f', '#3d5a80', '#81b29a', '#f2cc8f', '#ff6b6b', '#9b5de5'].map((color, index) => (
                                <Sticker 
                                    key={color} 
                                    shape="rounded" 
                                    color={color} 
                                    rotation={Math.random() * 10 - 5}
                                >
                                    <span className="text-sm">{index + 1}</span>
                                </Sticker>
                            ))}
                        </div>
                    </section>

                    {/* 9. 涂鸦分隔线展示 */}
                    <section className="mb-20">
                        <div className="flex items-center gap-4 mb-8">
                            <Sticker shape="rounded" color="#e07a5f" className="w-16 h-12 text-sm">
                                09
                            </Sticker>
                            <HandwrittenText as="h2" font="caveat" size="3xl" color="#3d3d3d" underline>
                                涂鸦分隔线
                            </HandwrittenText>
                        </div>

                        <PaperTexture variant="white" className="p-8 rounded-lg space-y-8">
                            {(['wave', 'zigzag', 'scribble', 'dots', 'leaves', 'arrow'] as const).map((variant) => (
                                <div key={variant}>
                                    <div className="flex items-center gap-4 mb-2">
                                        <span className="text-xs text-gray-500 uppercase w-20">{variant}</span>
                                        <DoodleDivider variant={variant} color="#8b7355" className="flex-1" />
                                    </div>
                                </div>
                            ))}
                        </PaperTexture>
                    </section>

                    {/* 完整示例：组合使用 */}
                    <section className="mb-20">
                        <div className="flex items-center gap-4 mb-8">
                            <Sticker shape="star" color="#f2cc8f" className="w-16 h-12 text-sm">
                                ★
                            </Sticker>
                            <HandwrittenText as="h2" font="caveat" size="3xl" color="#3d3d3d" underline>
                                完整组合示例
                            </HandwrittenText>
                        </div>

                        <PaperTexture variant="notebook" className="p-8 md:p-12 rounded-lg shadow-lg">
                            <WashiTape color="pink" pattern="stripes" position="top-left" rotation={-3}>
                                <WashiTape color="blue" pattern="dots" position="top-right" rotation={4}>
                                    <div className="pt-8">
                                        <HandwrittenText 
                                            as="h3" 
                                            font="caveat" 
                                            size="4xl" 
                                            color="#3d3d3d" 
                                            className="text-center mb-6"
                                        >
                                            我的旅行日记
                                        </HandwrittenText>

                                        <DoodleDivider variant="wave" color="#8b7355" className="max-w-md mx-auto mb-8" />

                                        <div className="flex flex-wrap gap-6 justify-center mb-8">
                                            <PolaroidFrame
                                                src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&h=400&fit=crop"
                                                alt="Travel memory 1"
                                                caption="瑞士阿尔卑斯"
                                                size="small"
                                                rotation={-4}
                                                tapeColor="yellow"
                                            />
                                            <PolaroidFrame
                                                src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=400&fit=crop"
                                                alt="Travel memory 2"
                                                caption="马尔代夫海滩"
                                                size="small"
                                                rotation={3}
                                                tapeColor="green"
                                            />
                                            <PolaroidFrame
                                                src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=400&fit=crop"
                                                alt="Travel memory 3"
                                                caption="京都樱花季"
                                                size="small"
                                                rotation={-2}
                                                tapeColor="pink"
                                            />
                                        </div>

                                        <HandDrawnBorder color="#3d5a80" className="max-w-2xl mx-auto">
                                            <HandwrittenText font="indie-flower" size="lg" color="#4a4a4a" irregular={false}>
                                                旅行是心灵的阅读，每一张照片都是一段珍贵的回忆。
                                                用手绘的风格记录生活，让回忆更有温度。
                                            </HandwrittenText>
                                        </HandDrawnBorder>

                                        <div className="flex justify-center gap-4 mt-8">
                                            <ScribbleButton variant="primary" icon={<Heart className="w-4 h-4" />}>
                                                喜欢
                                            </ScribbleButton>
                                            <ScribbleButton variant="secondary" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
                                                查看更多
                                            </ScribbleButton>
                                        </div>
                                    </div>
                                </WashiTape>
                            </WashiTape>
                        </PaperTexture>
                    </section>

                    {/* 页脚 */}
                    <footer className="text-center py-12">
                        <DoodleDivider variant="scribble" color="#8b7355" className="max-w-xs mx-auto mb-8" />
                        <HandwrittenText font="caveat" size="xl" color="#8b7355">
                            Hand-Drawn UI Components
                        </HandwrittenText>
                        <p className="text-sm text-gray-500 mt-2">
                            Built with React + Tailwind CSS + Framer Motion
                        </p>
                    </footer>
                </div>
            </PaperTexture>
        </>
    );
}
